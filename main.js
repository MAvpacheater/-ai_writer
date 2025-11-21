// main.js - ВИПРАВЛЕНА ВЕРСІЯ

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

// Escape JSON string
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

// Clean JSON response - ПОКРАЩЕНА ВЕРСІЯ
function cleanJsonResponse(text) {
    if (!text) return null;
    
    console.log('Original API response:', text.substring(0, 300));
    
    // Видаляємо markdown блоки
    let cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    
    // Шукаємо JSON об'єкт (від першої { до останньої })
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
        console.error('No JSON braces found in response');
        return null;
    }
    
    let jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
    
    // Видаляємо коментарі
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Видаляємо зайві коми перед закриваючими дужками
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    
    // Виправляємо розриви рядків всередині строкових значень
    jsonStr = jsonStr.replace(/:\s*"([^"]*)\n([^"]*)"/, ':"$1 $2"');
    
    // Заміна одинарних лапок на подвійні (якщо є)
    // Але обережно, щоб не зіпсувати текст всередині строк
    const inStringContext = false;
    
    console.log('Cleaned JSON:', jsonStr.substring(0, 300));
    
    return jsonStr;
}

// Додаткова функція для парсингу з кількома спробами
function parseJsonSafely(text) {
    if (!text) throw new Error('Порожня відповідь від API');
    
    console.log('=== PARSING JSON ===');
    console.log('Original length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));
    
    // Спроба 1: звичайний парсинг
    try {
        const result = JSON.parse(text);
        console.log('✓ Attempt 1 SUCCESS');
        return result;
    } catch (e1) {
        console.warn('✗ Attempt 1 failed:', e1.message);
    }
    
    // Спроба 2: видалення markdown та пробілів
    try {
        let cleaned = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();
        
        const result = JSON.parse(cleaned);
        console.log('✓ Attempt 2 SUCCESS');
        return result;
    } catch (e2) {
        console.warn('✗ Attempt 2 failed:', e2.message);
    }
    
    // Спроба 3: знаходження JSON між { }
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            let jsonStr = text.substring(firstBrace, lastBrace + 1);
            
            // Видаляємо коментарі
            jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
            jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Видаляємо зайві коми
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
            
            const result = JSON.parse(jsonStr);
            console.log('✓ Attempt 3 SUCCESS');
            return result;
        }
    } catch (e3) {
        console.warn('✗ Attempt 3 failed:', e3.message);
    }
    
    // Спроба 4: агресивна заміна лапок та виправлення
    try {
        let aggressive = text
            .replace(/```[a-z]*\n?/gi, '')
            .replace(/^[^{]*/, '')
            .replace(/[^}]*$/, '')
            .replace(/'/g, '"')
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ')
            .replace(/  +/g, ' ')
            .trim();
        
        const result = JSON.parse(aggressive);
        console.log('✓ Attempt 4 SUCCESS');
        return result;
    } catch (e4) {
        console.warn('✗ Attempt 4 failed:', e4.message);
    }
    
    // Спроба 5: пошук масиву chapters безпосередньо
    try {
        const chaptersMatch = text.match(/"chapters"\s*:\s*\[([\s\S]*?)\]/);
        if (chaptersMatch) {
            const reconstructed = `{"chapters":[${chaptersMatch[1]}]}`;
            const result = JSON.parse(reconstructed);
            console.log('✓ Attempt 5 SUCCESS');
            return result;
        }
    } catch (e5) {
        console.warn('✗ Attempt 5 failed:', e5.message);
    }
    
    console.error('❌ ALL ATTEMPTS FAILED');
    console.error('Last 500 chars:', text.substring(text.length - 500));
    throw new Error('Не вдалося розпарсити JSON після 5 спроб. Можливо, модель повернула текст замість JSON.');
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

// Generate Outline - НАЙКРАЩА ВЕРСІЯ
async function generateOutline() {
    const btn = document.getElementById('btnOutline');
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';

    try {
        const settings = Storage.load('settings');
        
        if (!settings.title || !settings.genre) {
            throw new Error('Заповніть назву та жанр книги!');
        }
        
        const chaptersCount = settings.chapters || 10;
        
        // КРИТИЧНО: максимально простий та чіткий промпт
        const prompt = `You are a JSON generator. Return ONLY valid JSON, no explanations.

Create a book outline with ${chaptersCount} chapters.

Book info:
- Title: ${settings.title}
- Genre: ${settings.genre}
- Style: ${settings.style || 'narrative'}

RETURN ONLY THIS EXACT JSON FORMAT (no markdown, no comments, no extra text):

{"chapters":[{"number":1,"title":"Chapter title","summary":"Chapter description","keyEvents":["event 1","event 2"]},{"number":2,"title":"Chapter title","summary":"Chapter description","keyEvents":["event 1","event 2"]}]}

Generate ${chaptersCount} chapters with interesting plot development. Use Ukrainian language for titles, summaries and events.

IMPORTANT: Return ONLY the JSON object, nothing else!`;

        console.log('📤 Sending outline request...');
        const result = await callAPI(prompt);
        
        if (!result || result.trim().length === 0) {
            throw new Error('API повернув порожню відповідь');
        }
        
        console.log('📥 Received response, length:', result.length);
        
        // Використовуємо покращений парсер
        outline = parseJsonSafely(result);
        
        // Валідація
        if (!outline || typeof outline !== 'object') {
            throw new Error('Відповідь не є об\'єктом');
        }
        
        if (!outline.chapters) {
            // Спроба знайти chapters у різних форматах
            if (outline.Chapters) outline.chapters = outline.Chapters;
            else if (outline.CHAPTERS) outline.chapters = outline.CHAPTERS;
            else throw new Error('Не знайдено поле "chapters"');
        }
        
        if (!Array.isArray(outline.chapters)) {
            throw new Error('"chapters" не є масивом');
        }
        
        if (outline.chapters.length === 0) {
            throw new Error('Масив розділів порожній');
        }
        
        // Нормалізація кожного розділу
        outline.chapters = outline.chapters.map((ch, idx) => {
            const normalized = {
                number: parseInt(ch.number || ch.Number || (idx + 1)),
                title: String(ch.title || ch.Title || `Розділ ${idx + 1}`).trim(),
                summary: String(ch.summary || ch.Summary || ch.description || 'Опис відсутній').trim(),
                keyEvents: []
            };
            
            // Обробка keyEvents
            if (Array.isArray(ch.keyEvents)) {
                normalized.keyEvents = ch.keyEvents.filter(e => e && String(e).trim());
            } else if (Array.isArray(ch.KeyEvents)) {
                normalized.keyEvents = ch.KeyEvents.filter(e => e && String(e).trim());
            } else if (Array.isArray(ch.events)) {
                normalized.keyEvents = ch.events.filter(e => e && String(e).trim());
            }
            
            return normalized;
        });
        
        console.log('✅ Outline validated:', {
            chaptersCount: outline.chapters.length,
            firstChapter: outline.chapters[0]
        });
        
        Storage.save('currentBook', { outline, chapters });
        displayOutline();
        updateHeaderStats();
        
        showNotification(
            `✅ Outline успішно створено!\n\n` +
            `Розділів: ${outline.chapters.length}\n` +
            `Перший розділ: "${outline.chapters[0].title}"`,
            'success'
        );
        
    } catch (error) {
        console.error('❌ Outline Generation Error:', error);
        
        let errorMsg = `❌ Не вдалося створити outline:\n\n${error.message}\n\n`;
        errorMsg += `📋 Що спробувати:\n`;
        errorMsg += `1. Змініть модель (спробуйте іншу версію Gemini)\n`;
        errorMsg += `2. Зменшіть кількість розділів (наприклад, до 5)\n`;
        errorMsg += `3. Перевірте, чи правильний API ключ\n`;
        errorMsg += `4. Натисніть "Тест API" щоб перевірити з'єднання`;
        
        showNotification(errorMsg, 'error');
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
            <div class="outline-events">Події: ${ch.keyEvents?.length ? ch.keyEvents.join(', ') : 'немає'}</div>
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
        
        const prompt = `Ти - професійний письменник. Напиши повний художній текст розділу книги.

РОЗДІЛ ${chapterInfo.number}: "${chapterInfo.title}"

КОНТЕКСТ:
${contextInfo}

ПЛАН РОЗДІЛУ:
${chapterInfo.summary}

КЛЮЧОВІ ПОДІЇ:
${chapterInfo.keyEvents?.join(', ') || 'немає'}

ПАРАМЕТРИ:
- Жанр: ${settings.genre}
- Стиль: ${settings.style}
- Тональність: ${settings.tone}
- Поетичність: ${settings.poetryLevel}/10
- Бажана довжина: ~${settings.chapterLength} слів
- Персонажі: ${settings.characters}

ВАЖЛИВО: Напиши ТІЛЬКИ художній текст без заголовків, нумерації та коментарів. Почни відразу з тексту історії. Створи атмосферний, захоплюючий розділ.`;

        const content = await callAPI(prompt);
        
        if (!content || content.trim().length < 100) {
            throw new Error('Отриманий текст занадто короткий або порожній');
        }
        
        // Очищаємо текст від можливих артефактів
        const cleanContent = content
            .replace(/^```.*\n?/gm, '')
            .replace(/```$/g, '')
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
        showNotification(`✅ Розділ ${chapterInfo.number} згенеровано успішно!`, 'success');
        
        displayGenerateContent();
        
    } catch (error) {
        console.error('Chapter Generation Error:', error);
        showNotification('❌ Помилка генерації розділу:\n' + error.message, 'error');
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
        
        const chapterData = {
            number: ch.number,
            title: ch.title,
            summary: ch.summary,
            keyEvents: ch.keyEvents || []
        };
        
        const chapterJson = JSON.stringify(chapterData)
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
