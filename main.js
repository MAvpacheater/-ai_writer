// main.js

// Storage Manager
const Storage = {
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    load: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }
};

// Global Variables
let outline = null;
let chapters = [];
let context = {};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    updateHeaderStats();
});

// Event Listeners Setup
function setupEventListeners() {
    // Sliders
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
    
    // API Provider
    const providerSelect = document.getElementById('apiProvider');
    if (providerSelect) {
        providerSelect.addEventListener('change', handleProviderChange);
    }
}

// Handle Provider Change
function handleProviderChange(e) {
    const provider = e.target.value;
    const modelSelect = document.getElementById('modelName');
    const customBlock = document.getElementById('customUrlBlock');
    
    modelSelect.innerHTML = '';
    customBlock.classList.add('hidden');
    
    if (provider === 'gemini') {
        modelSelect.innerHTML = `
            <option value="gemini-3-pro">Gemini 3 pro</option>
            <option value="gemini-2.5-flash-lite">gemini 2.5 flash-lite</option>
            <option value="gemini-2.5-flash-live">gemini 2.5 flash-live</option>
            <option value="gemini-2.0-flash-live">gemini 2.0 flash-live</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
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

// Load Settings
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
        
        // Trigger provider change
        const providerElement = document.getElementById('apiProvider');
        if (providerElement) {
            providerElement.dispatchEvent(new Event('change'));
        }
        
        // Update slider values
        const valueElements = [
            'tempValue', 'topPValue', 'topKValue', 'maxTokensValue', 
            'poetryValue', 'chaptersValue', 'chapterLengthValue'
        ];
        
        valueElements.forEach(id => {
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

// Save Settings
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

// Switch Tab
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
    
    // Tab-specific actions
    if (tab === 'generate') {
        displayGenerateContent();
    } else if (tab === 'export') {
        updateExportStatus();
        updatePreview();
    }
}

// Escape JSON string - КРИТИЧНО для уникнення помилок
function escapeJsonString(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f')
        .replace(/\b/g, '\\b');
}

// Clean JSON response
function cleanJsonResponse(text) {
    if (!text) return null;
    
    // Видаляємо markdown
    let cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    
    // Шукаємо JSON об'єкт
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    
    let jsonStr = match[0];
    
    // Видаляємо коментарі
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Виправляємо розриви рядків у строках
    jsonStr = jsonStr.replace(/"\s*\n\s*"/g, '" "');
    
    return jsonStr;
}

// API Call
async function callAPI(prompt) {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) {
        throw new Error('Введіть API ключ!');
    }

    const provider = document.getElementById('apiProvider').value;
    const model = document.getElementById('modelName').value;
    const settings = {
        temperature: parseFloat(document.getElementById('temperature').value),
        topP: parseFloat(document.getElementById('topP').value),
        topK: parseInt(document.getElementById('topK').value),
        maxTokens: parseInt(document.getElementById('maxTokens').value)
    };

    let response;
    
    if (provider === 'gemini') {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: settings.temperature,
                    topK: settings.topK,
                    topP: settings.topP,
                    maxOutputTokens: settings.maxTokens
                }
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.error?.message || JSON.stringify(data);
            throw new Error(`Gemini API: ${errorMsg}`);
        }
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
    } else if (provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: settings.temperature,
                top_p: settings.topP,
                max_tokens: settings.maxTokens
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.error?.message || JSON.stringify(data);
            throw new Error(`OpenAI API: ${errorMsg}`);
        }
        return data.choices?.[0]?.message?.content || '';
        
    } else if (provider === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: settings.temperature,
                top_p: settings.topP,
                max_tokens: settings.maxTokens
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.error?.message || JSON.stringify(data);
            throw new Error(`Anthropic API: ${errorMsg}`);
        }
        return data.content?.[0]?.text || '';
        
    } else if (provider === 'custom') {
        const customUrl = document.getElementById('customUrl').value;
        if (!customUrl) throw new Error('Введіть Custom URL');
        
        response = await fetch(customUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: settings.temperature,
                max_tokens: settings.maxTokens
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Custom API: ${JSON.stringify(data)}`);
        }
        return data.choices?.[0]?.message?.content || data.content || '';
    }
}

// Test API
async function testAPI() {
    try {
        showNotification('⏳ Тестування API...', 'info');
        const result = await callAPI('Напиши одне речення українською.');
        showNotification('✅ API працює!\n\nВідповідь: ' + result.substring(0, 200), 'success');
    } catch (error) {
        console.error('API Test Error:', error);
        showNotification('❌ Помилка API:\n' + error.message, 'error');
    }
}

// Generate Outline - ПОВНІСТЮ ВИПРАВЛЕНО
async function generateOutline() {
    const btn = document.getElementById('btnOutline');
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';

    try {
        const settings = Storage.load('settings');
        
        if (!settings.title || !settings.genre) {
            throw new Error('Заповніть назву та жанр книги!');
        }
        
        const prompt = `Створи детальний outline книги. Дуже важливо повернути ТІЛЬКИ валідний JSON без жодних пояснень.

Параметри книги:
- Назва: ${settings.title}
- Жанр: ${settings.genre}
- Стиль: ${settings.style || 'художній'}
- Тональність: ${settings.tone || 'нейтральна'}
- Персонажі: ${settings.characters || 'не вказано'}
- Світ: ${settings.world || 'не вказано'}
- Головна ідея: ${settings.mainIdea || 'не вказано'}
- Конфлікт: ${settings.conflict || 'не вказано'}
- Кількість розділів: ${settings.chapters || 10}

ФОРМАТ ВІДПОВІДІ - повинен бути ТІЛЬКИ цей JSON і нічого більше:
{"chapters":[{"number":1,"title":"Назва розділу","summary":"Детальний опис що відбувається у розділі","keyEvents":["подія 1","подія 2","подія 3"]}]}

Створи ${settings.chapters || 10} розділів. Кожен розділ повинен мати номер, назву, опис та 2-4 ключові події.`;

        console.log('Sending prompt...');
        const result = await callAPI(prompt);
        console.log('Raw API Response:', result);
        
        // Очищаємо відповідь
        const cleanedJson = cleanJsonResponse(result);
        if (!cleanedJson) {
            throw new Error('API не повернув JSON. Відповідь: ' + result.substring(0, 300));
        }
        
        console.log('Cleaned JSON:', cleanedJson);
        
        // Парсимо JSON
        try {
            outline = JSON.parse(cleanedJson);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Attempted to parse:', cleanedJson.substring(0, 500));
            throw new Error(`Помилка парсингу JSON: ${parseError.message}. Перевірте відповідь API.`);
        }
        
        // Валідація структури
        if (!outline || typeof outline !== 'object') {
            throw new Error('Outline не є об\'єктом');
        }
        
        if (!outline.chapters || !Array.isArray(outline.chapters)) {
            throw new Error('Відсутній масив chapters');
        }
        
        if (outline.chapters.length === 0) {
            throw new Error('Масив chapters порожній');
        }
        
        // Валідація кожного розділу
        outline.chapters = outline.chapters.map((ch, idx) => {
            return {
                number: ch.number || (idx + 1),
                title: ch.title || `Розділ ${idx + 1}`,
                summary: ch.summary || 'Опис відсутній',
                keyEvents: Array.isArray(ch.keyEvents) ? ch.keyEvents : []
            };
        });
        
        console.log('Validated outline:', outline);
        
        Storage.save('currentBook', { outline, chapters });
        displayOutline();
        updateHeaderStats();
        showNotification(`✅ Outline згенеровано!\nРозділів: ${outline.chapters.length}`, 'success');
        
    } catch (error) {
        console.error('Outline Generation Error:', error);
        showNotification(`❌ Помилка генерації:\n${error.message}\n\nПорада: Спробуйте змінити модель або зменшити кількість розділів.`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '▶️ Згенерувати outline';
    }
}

// Display Outline
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
            <div class="outline-events">Події: ${ch.keyEvents?.join(', ') || 'немає'}</div>
        </div>
    `).join('');
}

// Generate Chapter
async function generateChapter(chapterInfo, btnId) {
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';

    try {
        const settings = Storage.load('settings');
        
        const contextInfo = chapters.length > 0 
            ? `Попередні події: ${context.events?.slice(-5).join(', ') || 'немає'}`
            : 'Це перший розділ';
        
        const prompt = `Напиши повний художній текст розділу книги.

РОЗДІЛ ${chapterInfo.number}: "${chapterInfo.title}"

Контекст:
${contextInfo}

План цього розділу:
${chapterInfo.summary}

Ключові події які мають статися:
${chapterInfo.keyEvents?.join(', ') || 'немає'}

Параметри написання:
- Жанр: ${settings.genre}
- Стиль: ${settings.style}
- Тональність: ${settings.tone}
- Рівень поетичності: ${settings.poetryLevel}/10
- Бажана довжина: приблизно ${settings.chapterLength} слів
- Персонажі: ${settings.characters}

ВАЖЛИВО: Напиши ТІЛЬКИ художній текст розділу без заголовків, номерів та будь-яких мета-коментарів. Починай відразу з тексту історії. Створи атмосферний, захоплюючий текст.`;

        const content = await callAPI(prompt);
        
        if (!content || content.length < 100) {
            throw new Error('Отриманий текст занадто короткий');
        }
        
        chapters.push({ 
            number: chapterInfo.number,
            title: chapterInfo.title,
            content: content.trim()
        });
        
        context.lastChapter = chapterInfo.number;
        context.events = [...(context.events || []), ...(chapterInfo.keyEvents || [])];
        
        Storage.save('currentBook', { outline, chapters });
        
        btn.textContent = '✅ Готово';
        updateHeaderStats();
        updateExportStatus();
        showNotification(`✅ Розділ ${chapterInfo.number} згенеровано!`, 'success');
        
        // Оновлюємо відображення
        displayGenerateContent();
        
    } catch (error) {
        console.error('Chapter Generation Error:', error);
        showNotification('❌ Помилка: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Згенерувати';
    }
}

// Display Generate Content
function displayGenerateContent() {
    const container = document.getElementById('generateContent');
    if (!container) return;
    
    if (!outline || !outline.chapters) {
        container.innerHTML = '<p style="color: #a0a0b0;">Спочатку створіть outline на вкладці "Структура"</p>';
        return;
    }
    
    container.innerHTML = outline.chapters.map((ch, i) => {
        const generated = chapters.find(c => c.number === ch.number);
        
        // Безпечне escape для JSON у HTML атрибуті
        const safeChapter = {
            number: ch.number,
            title: escapeJsonString(ch.title),
            summary: escapeJsonString(ch.summary),
            keyEvents: ch.keyEvents || []
        };
        
        const chapterJson = JSON.stringify(safeChapter)
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;');
        
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
}

// Update Export Status
function updateExportStatus() {
    const statusElement = document.getElementById('exportStatus');
    const headerElement = document.getElementById('headerChaptersCount');
    const total = outline?.chapters?.length || 0;
    const completed = chapters.length;
    const status = `${completed} / ${total}`;
    
    if (statusElement) statusElement.textContent = status;
    if (headerElement) headerElement.textContent = status;
}

// Update Header Stats
function updateHeaderStats() {
    updateExportStatus();
}

// Update Preview
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

// Export Book
function exportBook(format) {
    if (chapters.length === 0) {
        showNotification('⚠️ Немає розділів для експорту!', 'warning');
        return;
    }

    const settings = Storage.load('settings');
    const title = settings.title || 'Книга';
    
    // Сортуємо розділи за номером
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
        // Простий EPUB як HTML
        let html = `<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
</head>
<body>
    <h1>${title}</h1>`;
        sortedChapters.forEach(ch => {
            const paragraphs = ch.content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('\n');
            html += `\n<h2>Розділ ${ch.number}: ${ch.title}</h2>\n${paragraphs}`;
        });
        html += '\n</body>\n</html>';
        download(html, `${title}.epub`, 'application/epub+zip');
    }
    
    showNotification(`✅ Книга "${title}" експортована у форматі ${format.toUpperCase()}!`, 'success');
}

// Download File
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

// Show Notification
function showNotification(message, type = 'info') {
    alert(message);
}
