// app.js - Основна логіка програми

// Сховище даних
const Storage = {
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    load: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }
};

// Глобальні змінні
let outline = null;
let chapters = [];
let context = {};
let isGenerating = false;

// Ініціалізація при завантаженні
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    updateHeaderStats();
});

// Налаштування слухачів подій
function setupEventListeners() {
    const sliders = [
        ['temperature', 'tempValue'],
        ['topP', 'topPValue'],
        ['topK', 'topKValue'],
        ['maxTokens', 'maxTokensValue'],
        ['poetryLevel', 'poetryValue'],
        ['chaptersCount', 'chaptersValue'],
        ['chapterLength', 'chapterLengthValue']
    ];
    
    sliders.forEach(([id, valueId]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', e => {
                document.getElementById(valueId).textContent = e.target.value;
            });
        }
    });
    
    const providerSelect = document.getElementById('apiProvider');
    if (providerSelect) {
        providerSelect.addEventListener('change', handleProviderChange);
    }
}

// Обробка зміни провайдера API
function handleProviderChange(e) {
    const provider = e.target.value;
    const modelSelect = document.getElementById('modelName');
    const customBlock = document.getElementById('customUrlBlock');
    
    modelSelect.innerHTML = '';
    customBlock.classList.add('hidden');
    
    if (provider === 'gemini') {
        modelSelect.innerHTML = `
            <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp (рекомендовано)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
        `;
    } else if (provider === 'openai') {
        modelSelect.innerHTML = `
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        `;
    } else if (provider === 'anthropic') {
        modelSelect.innerHTML = `
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
        `;
    } else if (provider === 'custom') {
        modelSelect.innerHTML = `<option value="custom">Custom Model</option>`;
        customBlock.classList.remove('hidden');
    }
}

// Завантаження налаштувань
function loadSettings() {
    const saved = Storage.load('settings');
    if (saved) {
        const fields = [
            'apiProvider', 'modelName', 'apiKey', 'customUrl', 'temperature', 
            'topP', 'topK', 'maxTokens', 'poetryLevel', 'title', 'genre', 
            'style', 'characters', 'world', 'mainIdea', 'conflict', 
            'chaptersCount', 'chapterLength', 'tone'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && saved[field] !== undefined) {
                element.value = saved[field];
            }
        });
        
        const providerElement = document.getElementById('apiProvider');
        if (providerElement) {
            providerElement.dispatchEvent(new Event('change'));
        }
        
        ['tempValue', 'topPValue', 'topKValue', 'maxTokensValue', 'poetryValue', 'chaptersValue', 'chapterLengthValue'].forEach(id => {
            const inputId = id.replace('Value', '');
            const inputElement = document.getElementById(inputId);
            const valueElement = document.getElementById(id);
            if (inputElement && valueElement) {
                valueElement.textContent = inputElement.value;
            }
        });
    }
    
    const savedBook = Storage.load('currentBook');
    if (savedBook) {
        outline = savedBook.outline;
        chapters = savedBook.chapters || [];
        updateHeaderStats();
    }
}

// Збереження налаштувань
function saveSettings() {
    const settings = {
        apiProvider: document.getElementById('apiProvider').value,
        modelName: document.getElementById('modelName').value,
        apiKey: document.getElementById('apiKey').value,
        customUrl: document.getElementById('customUrl').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        topP: parseFloat(document.getElementById('topP').value),
        topK: parseInt(document.getElementById('topK').value),
        maxTokens: parseInt(document.getElementById('maxTokens').value),
        poetryLevel: parseInt(document.getElementById('poetryLevel').value),
        title: document.getElementById('title').value,
        genre: document.getElementById('genre').value,
        style: document.getElementById('style').value,
        characters: document.getElementById('characters').value,
        world: document.getElementById('world').value,
        mainIdea: document.getElementById('mainIdea').value,
        conflict: document.getElementById('conflict').value,
        chapters: parseInt(document.getElementById('chaptersCount').value),
        chapterLength: parseInt(document.getElementById('chapterLength').value),
        tone: document.getElementById('tone').value
    };
    
    Storage.save('settings', settings);
    Storage.save('currentBook', { outline, chapters });
    
    showNotification('✅ Налаштування збережено!', 'success');
}

// Перемикання вкладок
function switchTab(tab) {
    const tabs = ['setup', 'outline', 'generate', 'export'];
    
    tabs.forEach(t => {
        const content = document.getElementById('content-' + t);
        const button = document.getElementById('tab-' + t);
        
        if (content) content.classList.remove('active');
        if (button) button.classList.remove('active');
    });
    
    const activeContent = document.getElementById('content-' + tab);
    const activeButton = document.getElementById('tab-' + tab);
    
    if (activeContent) activeContent.classList.add('active');
    if (activeButton) activeButton.classList.add('active');
    
    if (tab === 'generate') {
        displayGenerateContent();
    } else if (tab === 'export') {
        updateExportStatus();
        updatePreview();
    }
}

// ===== ВИПРАВЛЕНА ГЕНЕРАЦІЯ OUTLINE =====
async function generateOutline() {
    const btn = document.getElementById('btnOutline');
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';

    try {
        const settings = Storage.load('settings');
        
        if (!settings.title || !settings.genre) {
            throw new Error('Заповніть назву та жанр книги в налаштуваннях!');
        }
        
        const chaptersCount = settings.chapters || 10;
        
        // КРИТИЧНО ВАЖЛИВИЙ ПРОМПТ - ЯВНА ВКАЗІВКА ГЕНЕРУВАТИ ВСІ РОЗДІЛИ
        const prompt = `You are a professional book outline generator. 

CRITICAL INSTRUCTION: You MUST generate EXACTLY ${chaptersCount} chapters in a SINGLE response. Do NOT stop until all ${chaptersCount} chapters are complete.

Book details:
- Title: ${settings.title}
- Genre: ${settings.genre}
- Style: ${settings.style || 'narrative'}
- Total chapters needed: ${chaptersCount}
- Characters: ${settings.characters || 'not specified'}
- World: ${settings.world || 'not specified'}
- Main idea: ${settings.mainIdea || 'not specified'}
- Conflict: ${settings.conflict || 'not specified'}

REQUIREMENTS:
1. Generate ALL ${chaptersCount} chapters from 1 to ${chaptersCount}
2. All text MUST be in Ukrainian language
3. Return ONLY valid JSON - start with { and end with }
4. No markdown, no explanations, no text before or after JSON
5. Each chapter must have: number, title, summary, keyEvents

JSON structure (generate ALL ${chaptersCount} chapters):
{
  "chapters": [
    {
      "number": 1,
      "title": "Назва першого розділу українською",
      "summary": "Детальний опис що відбувається в розділі українською мовою (мінімум 2-3 речення)",
      "keyEvents": ["перша подія українською", "друга подія українською", "третя подія українською"]
    },
    {
      "number": 2,
      "title": "Назва другого розділу українською",
      "summary": "Детальний опис другого розділу українською мовою (мінімум 2-3 речення)",
      "keyEvents": ["перша подія", "друга подія", "третя подія"]
    },
    ... continue until chapter ${chaptersCount} ...
    {
      "number": ${chaptersCount},
      "title": "Назва останнього розділу українською",
      "summary": "Детальний опис фінального розділу українською мовою",
      "keyEvents": ["фінальна подія 1", "фінальна подія 2", "фінальна подія 3"]
    }
  ]
}

REMINDER: Generate complete array with ALL ${chaptersCount} chapters. Start with chapter 1, end with chapter ${chaptersCount}. No partial results!`;

        console.log(`📤 Запит outline для ${chaptersCount} розділів...`);
        
        // ЗБІЛЬШЕНО maxTokens для великих outline
        const originalMaxTokens = document.getElementById('maxTokens').value;
        document.getElementById('maxTokens').value = Math.max(16000, chaptersCount * 800);
        
        const result = await callAPI(prompt);
        
        // Відновлюємо maxTokens
        document.getElementById('maxTokens').value = originalMaxTokens;
        
        if (!result || result.trim().length === 0) {
            throw new Error('API повернув порожню відповідь');
        }
        
        console.log(`📥 Відповідь отримано (${result.length} символів), парсинг...`);
        outline = parseJsonSafely(result);
        
        if (!outline || typeof outline !== 'object') {
            throw new Error('Результат не є об\'єктом');
        }
        
        if (!outline.chapters && outline.Chapters) {
            outline.chapters = outline.Chapters;
        }
        
        if (!outline.chapters || !Array.isArray(outline.chapters)) {
            throw new Error('Поле chapters відсутнє або не масив');
        }
        
        if (outline.chapters.length === 0) {
            throw new Error('Масив розділів порожній');
        }
        
        // ПЕРЕВІРКА: чи отримали всі розділи?
        if (outline.chapters.length < chaptersCount) {
            console.warn(`⚠️ Отримано ${outline.chapters.length} з ${chaptersCount} розділів`);
            
            const retry = confirm(
                `⚠️ AI згенерував лише ${outline.chapters.length} з ${chaptersCount} розділів.\n\n` +
                `Спробувати ще раз?\n\n` +
                `Порада: Спробуйте зменшити кількість розділів або використати іншу модель.`
            );
            
            if (retry) {
                btn.disabled = false;
                btn.textContent = '▶️ Згенерувати outline';
                return generateOutline();
            }
        }
        
        // Нормалізація даних
        outline.chapters = outline.chapters.map((ch, idx) => ({
            number: parseInt(ch.number || ch.Number || (idx + 1)),
            title: String(ch.title || ch.Title || `Розділ ${idx + 1}`).trim(),
            summary: String(ch.summary || ch.Summary || ch.description || 'Опис відсутній').trim(),
            keyEvents: Array.isArray(ch.keyEvents) ? ch.keyEvents.filter(e => e && typeof e === 'string') :
                       Array.isArray(ch.KeyEvents) ? ch.KeyEvents.filter(e => e && typeof e === 'string') :
                       Array.isArray(ch.events) ? ch.events.filter(e => e && typeof e === 'string') : []
        }));
        
        console.log(`✅ Outline створено: ${outline.chapters.length} розділів`);
        
        Storage.save('currentBook', { outline, chapters });
        displayOutline();
        updateHeaderStats();
        
        showNotification(
            `✅ Outline успішно створено!\n\n` +
            `Розділів: ${outline.chapters.length}/${chaptersCount}\n` +
            `Перший: "${outline.chapters[0].title}"\n` +
            `Останній: "${outline.chapters[outline.chapters.length - 1].title}"`,
            'success'
        );
        
    } catch (error) {
        console.error('❌ Помилка outline:', error);
        
        showNotification(
            `❌ Помилка створення outline:\n\n${error.message}\n\n` +
            `💡 Спробуйте:\n` +
            `1. Зменшіть кількість розділів (спробуйте 5-7)\n` +
            `2. Використайте Gemini 2.0 Flash Exp\n` +
            `3. Збільшіть Max Tokens до 16000+\n` +
            `4. Натисніть F12 → Console для деталей`,
            'error'
        );
    } finally {
        btn.disabled = false;
        btn.textContent = '▶️ Згенерувати outline';
    }
}

// Відображення outline
function displayOutline() {
    const container = document.getElementById('outlineContent');
    if (!container) return;
    
    if (!outline || !outline.chapters) {
        container.innerHTML = '<p style="color: #a0a0b0;">Outline ще не створено</p>';
        return;
    }
    
    container.innerHTML = outline.chapters.map(ch => `
        <div class="outline-item">
            <h3 class="outline-title">Розділ ${ch.number}: ${ch.title}</h3>
            <p class="outline-summary">${ch.summary}</p>
            <div class="outline-events">Події: ${ch.keyEvents?.length ? ch.keyEvents.join(', ') : 'немає'}</div>
        </div>
    `).join('');
}

// Генерація одного розділу
async function generateChapter(chapterInfo, btnId) {
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';

    try {
        const settings = Storage.load('settings');
        
        const contextInfo = chapters.length > 0 
            ? `Попередні події: ${context.events?.slice(-5).join(', ') || 'немає'}`
            : 'Це перший розділ книги';
        
        const prompt = `Ти професійний письменник. Напиши повний художній текст розділу.

РОЗДІЛ ${chapterInfo.number}: "${chapterInfo.title}"

КОНТЕКСТ:
${contextInfo}

ПЛАН:
${chapterInfo.summary}

ПОДІЇ:
${chapterInfo.keyEvents?.join(', ') || 'немає'}

ПАРАМЕТРИ:
- Жанр: ${settings.genre}
- Стиль: ${settings.style}
- Тональність: ${settings.tone}
- Поетичність: ${settings.poetryLevel}/10
- Довжина: ~${settings.chapterLength} слів
- Персонажі: ${settings.characters}

КРИТИЧНО ВАЖЛИВО:
1. Пиши ТІЛЬКИ художній текст
2. БЕЗ заголовків, БЕЗ нумерації
3. Почни відразу з історії
4. Створи атмосферу
5. Українською мовою

Починай:`;

        const content = await callAPI(prompt);
        
        if (!content || content.trim().length < 100) {
            throw new Error('Текст занадто короткий');
        }
        
        const cleanContent = content
            .replace(/^```.*\n?/gm, '')
            .replace(/```$/g, '')
            .replace(/^Розділ \d+:.*$/gm, '')
            .replace(/^#{1,6}\s+.*$/gm, '')
            .trim();
        
        chapters.push({ 
            number: chapterInfo.number,
            title: chapterInfo.title,
            content: cleanContent
        });
        
        context.lastChapter = chapterInfo.number;
        context.events = [...(context.events || []), ...(chapterInfo.keyEvents || [])];
        
        Storage.save('currentBook', { outline, chapters });
        
        btn.textContent = '✅ Готово';
        updateHeaderStats();
        updateExportStatus();
        
        displayGenerateContent();
        
    } catch (error) {
        console.error('Помилка генерації:', error);
        showNotification('❌ Помилка розділу ' + chapterInfo.number + ':\n' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Згенерувати';
        throw error;
    }
}

// Генерація всіх розділів підряд
async function generateAllChapters() {
    if (!outline || !outline.chapters) {
        showNotification('❌ Спочатку створіть outline!', 'error');
        return;
    }
    
    if (isGenerating) {
        showNotification('⚠️ Генерація вже йде!', 'warning');
        return;
    }
    
    isGenerating = true;
    
    const allBtn = document.getElementById('btnGenerateAll');
    if (allBtn) {
        allBtn.disabled = true;
        allBtn.textContent = '⏳ Генерація всіх розділів...';
    }
    
    try {
        const toGenerate = outline.chapters.filter(ch => !chapters.find(c => c.number === ch.number));
        
        if (toGenerate.length === 0) {
            showNotification('✅ Всі розділи вже згенеровані!', 'success');
            return;
        }
        
        console.log(`📚 Генерація ${toGenerate.length} розділів...`);
        
        for (let i = 0; i < toGenerate.length; i++) {
            const ch = toGenerate[i];
            const btnId = `btn-ch-${outline.chapters.indexOf(ch)}`;
            
            console.log(`📝 Генерація розділу ${ch.number}/${outline.chapters.length}: "${ch.title}"`);
            
            try {
                await generateChapter(ch, btnId);
                console.log(`✅ Розділ ${ch.number} готово`);
                
                if (i < toGenerate.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                console.error(`❌ Помилка розділу ${ch.number}:`, error);
                
                const continueGen = confirm(
                    `❌ Помилка при генерації розділу ${ch.number}:\n\n${error.message}\n\n` +
                    `Згенеровано: ${i} з ${toGenerate.length}\n\n` +
                    `Продовжити генерацію наступних розділів?`
                );
                
                if (!continueGen) {
                    throw new Error('Генерація перервана користувачем');
                }
                
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        showNotification(
            `✅ Генерація завершена!\n\n` +
            `Всього розділів: ${chapters.length}/${outline.chapters.length}\n\n` +
            `Готово до експорту!`,
            'success'
        );
        
        switchTab('export');
        
    } catch (error) {
        console.error('❌ Помилка масової генерації:', error);
        showNotification(
            `❌ Помилка генерації:\n\n${error.message}\n\n` +
            `Згенеровано розділів: ${chapters.length}/${outline.chapters.length}`,
            'error'
        );
    } finally {
        isGenerating = false;
        if (allBtn) {
            allBtn.disabled = false;
            allBtn.textContent = '🚀 Згенерувати всі розділи';
        }
    }
}

// Відображення контенту для генерації
function displayGenerateContent() {
    const container = document.getElementById('generateContent');
    if (!container) return;
    
    if (!outline || !outline.chapters) {
        container.innerHTML = '<p style="color: #a0a0b0;">Спочатку створіть outline</p>';
        return;
    }
    
    const totalChapters = outline.chapters.length;
    const completedChapters = chapters.length;
    const remainingChapters = totalChapters - completedChapters;
    
    let html = `
        <div style="margin-bottom: 30px; padding: 20px; background: rgba(179, 102, 255, 0.1); border-radius: 10px; border: 1px solid var(--purple-neon);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: var(--purple-neon);">Прогрес генерації</h3>
                    <p style="margin: 0; color: var(--text-secondary);">
                        Згенеровано: <strong style="color: var(--cyan-neon);">${completedChapters}/${totalChapters}</strong> розділів
                        ${remainingChapters > 0 ? `<span style="color: #ff9800;">(залишилось: ${remainingChapters})</span>` : ''}
                    </p>
                </div>
                <button onclick="generateAllChapters()" id="btnGenerateAll" class="btn btn-primary" ${isGenerating ? 'disabled' : ''}>
                    🚀 Згенерувати всі розділи
                </button>
            </div>
        </div>
    `;
    
    html += outline.chapters.map((ch, i) => {
        const generated = chapters.find(c => c.number === ch.number);
        const chapterData = { number: ch.number, title: ch.title, summary: ch.summary, keyEvents: ch.keyEvents || [] };
        const chapterJson = JSON.stringify(chapterData).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        
        return `
            <div class="chapter-item">
                <div class="chapter-header">
                    <h3 class="chapter-title">Розділ ${ch.number}: ${ch.title}</h3>
                    ${!generated 
                        ? `<button onclick='generateChapter(${chapterJson}, "btn-ch-${i}")' id="btn-ch-${i}" class="btn btn-primary">Згенерувати</button>`
                        : '<span class="chapter-status">✅ Готово</span>'
                    }
                </div>
                ${generated 
                    ? `<div class="chapter-preview">${generated.content.substring(0, 500)}...</div>` 
                    : `<p style="color: #666; font-size: 0.9rem; margin-top: 10px;">${ch.summary}</p>`
                }
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Оновлення статусу експорту
function updateExportStatus() {
    const statusElement = document.getElementById('exportStatus');
    const headerElement = document.getElementById('headerChaptersCount');
    const total = outline?.chapters?.length || 0;
    const completed = chapters.length;
    const status = `${completed} / ${total}`;
    
    if (statusElement) statusElement.textContent = status;
    if (headerElement) headerElement.textContent = status;
}

// Оновлення статистики в хедері
function updateHeaderStats() {
    updateExportStatus();
}

// Оновлення попереднього перегляду
function updatePreview() {
    const container = document.getElementById('previewContent');
    if (!container) return;
    
    if (chapters.length === 0) {
        container.innerHTML = '<p style="color: #a0a0b0;">Немає згенерованих розділів</p>';
        return;
    }
    
    container.innerHTML = chapters
        .sort((a, b) => a.number - b.number)
        .map(ch => `
            <div class="preview-chapter">
                <h4 class="preview-chapter-title">Розділ ${ch.number}: ${ch.title}</h4>
                <p class="preview-chapter-content">${ch.content}</p>
            </div>
        `).join('');
}

// Експорт книги
function exportBook(format) {
    if (chapters.length === 0) {
        showNotification('⚠️ Немає розділів для експорту!', 'warning');
        return;
    }

    const settings = Storage.load('settings');
    const title = settings.title || 'Книга';
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

    if (format === 'txt') {
        let content = `${title}\n${'='.repeat(title.length)}\n\n`;
        sortedChapters.forEach(ch => {
            content += `\n\nРОЗДІЛ ${ch.number}: ${ch.title}\n${'-'.repeat(50)}\n\n${ch.content}\n`;
        });
        download(content, `${title}.txt`, 'text/plain');
        
    } else if (format === 'html') {
        let html = `<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { max-width: 800px; margin: 40px auto; font-family: Georgia, serif; line-height: 1.8; padding: 20px; background: #f5f5f5; }
        h1 { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; }
        h2 { margin-top: 60px; color: #333; page-break-before: always; }
        p { text-indent: 2em; margin: 1em 0; text-align: justify; }
    </style>
</head>
<body>
    <h1>${title}</h1>`;
        sortedChapters.forEach(ch => {
            const paragraphs = ch.content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('\n');
            html += `\n<h2>Розділ ${ch.number}: ${ch.title}</h2>\n${paragraphs}`;
        });
        html += '\n</body>\n</html>';
        download(html, `${title}.html`, 'text/html');
        
    } else if (format === 'epub') {
        let html = `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="utf-8"><title>${title}</title></head>
<body><h1>${title}</h1>`;
        sortedChapters.forEach(ch => {
            const paragraphs = ch.content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('\n');
            html += `\n<h2>Розділ ${ch.number}: ${ch.title}</h2>\n${paragraphs}`;
        });
        html += '\n</body>\n</html>';
        download(html, `${title}.epub`, 'application/epub+zip');
    }
    
    showNotification(`✅ "${title}" експортовано (${format.toUpperCase()})!`, 'success');
}

// Завантаження файлу
function download(content, filename, type) {
    const blob = new Blob([content], { type: type + ';charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Показ сповіщення
function showNotification(message, type = 'info') {
    alert(message);
}
