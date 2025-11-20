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
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (рекомендовано)</option>
            <option value="gemini-3.0-pro">Gemini 3 Pro</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
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
        if (!response.ok) throw new Error(data.error?.message || 'API error');
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
        if (!response.ok) throw new Error(data.error?.message || 'API error');
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
        if (!response.ok) throw new Error(data.error?.message || 'API error');
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
        if (!response.ok) throw new Error(data.error?.message || 'API error');
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
        showNotification('❌ Помилка API:\n' + error.message, 'error');
    }
}

// Generate Outline - ВИПРАВЛЕНО
async function generateOutline() {
    const btn = document.getElementById('btnOutline');
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';

    try {
        const settings = Storage.load('settings');
        const prompt = `Створи детальний outline книги у форматі JSON:
Назва: ${settings.title}
Жанр: ${settings.genre}
Стиль: ${settings.style}
Тональність: ${settings.tone}
Персонажі: ${settings.characters}
Світ: ${settings.world}
Головна ідея: ${settings.mainIdea}
Конфлікт: ${settings.conflict}
Кількість розділів: ${settings.chapters}

КРИТИЧНО ВАЖЛИВО: Поверни ТІЛЬКИ валідний JSON без жодних пояснень, коментарів чи markdown форматування.
Формат:
{
  "chapters": [
    {"number": 1, "title": "Назва розділу", "summary": "Детальний опис що відбувається", "keyEvents": ["подія1", "подія2", "подія3"]}
  ]
}`;

        const result = await callAPI(prompt);
        console.log('API Response:', result);
        
        // Видаляємо markdown форматування та зайві символи
        let cleanResult = result
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        
        // Знаходимо JSON об'єкт
        const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('API не повернув валідний JSON. Відповідь: ' + result.substring(0, 200));
        }
        
        outline = JSON.parse(jsonMatch[0]);
        
        // Перевірка структури
        if (!outline.chapters || !Array.isArray(outline.chapters) || outline.chapters.length === 0) {
            throw new Error('Невірна структура outline. Спробуйте ще раз.');
        }
        
        Storage.save('currentBook', { outline, chapters });
        displayOutline();
        updateHeaderStats();
        showNotification('✅ Outline згенеровано! Розділів: ' + outline.chapters.length, 'success');
    } catch (error) {
        console.error('Outline generation error:', error);
        showNotification('❌ Помилка: ' + error.message + '\n\nСпробуйте ще раз або змініть параметри.', 'error');
    }

    btn.disabled = false;
    btn.textContent = '▶️ Згенерувати outline';
}

// Display Outline
function displayOutline() {
    const container = document.getElementById('outlineContent');
    if (!container) return;
    
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
        const prompt = `Напиши повний текст розділу ${chapterInfo.number}: "${chapterInfo.title}"

Контекст світу: ${JSON.stringify(context)}
План розділу: ${chapterInfo.summary}
Ключові події: ${chapterInfo.keyEvents?.join(', ')}

Параметри написання:
- Стиль: ${settings.style}
- Тональність: ${settings.tone}
- Рівень поетичності: ${settings.poetryLevel}/10
- Бажана довжина: ~${settings.chapterLength} слів
- Жанр: ${settings.genre}

Напиши ТІЛЬКИ текст розділу без заголовків та пояснень. Створи атмосферний, захоплюючий текст.`;

        const content = await callAPI(prompt);
        chapters.push({ ...chapterInfo, content });
        
        context.lastChapter = chapterInfo.number;
        context.events = [...(context.events || []), ...(chapterInfo.keyEvents || [])];
        
        Storage.save('currentBook', { outline, chapters });
        btn.textContent = '✅ Готово';
        updateHeaderStats();
        updateExportStatus();
        showNotification('✅ Розділ згенеровано!', 'success');
    } catch (error) {
        showNotification('❌ Помилка: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Згенерувати';
    }
}

// Display Generate Content
function displayGenerateContent() {
    const container = document.getElementById('generateContent');
    if (!container) return;
    
    if (!outline) {
        container.innerHTML = '<p class="text-secondary">Спочатку створіть outline</p>';
        return;
    }
    
    container.innerHTML = outline.chapters.map((ch, i) => {
        const generated = chapters.find(c => c.number === ch.number);
        const chapterData = JSON.stringify(ch).replace(/"/g, '&quot;');
        
        return `
            <div class="chapter-item">
                <div class="chapter-header">
                    <h3 class="chapter-title">Розділ ${ch.number}: ${ch.title}</h3>
                    ${!generated 
                        ? `<button onclick="generateChapter(${chapterData}, 'btn-ch-${i}')" id="btn-ch-${i}" class="btn btn-primary">Згенерувати</button>`
                        : '<span class="chapter-status">✅ Готово</span>'
                    }
                </div>
                ${generated ? `<div class="chapter-preview">${generated.content.substring(0, 500)}...</div>` : ''}
            </div>
        `;
    }).join('');
}

// Update Export Status
function updateExportStatus() {
    const statusElement = document.getElementById('exportStatus');
    const headerElement = document.getElementById('headerChaptersCount');
    const status = `${chapters.length} / ${outline?.chapters?.length || 0}`;
    
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
        container.innerHTML = '<p class="text-secondary">Немає згенерованих розділів</p>';
        return;
    }
    
    container.innerHTML = chapters.map(ch => `
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

    if (format === 'txt') {
        let content = `${title}\n${'='.repeat(title.length)}\n\n`;
        chapters.forEach(ch => {
            content += `\n\nРОЗДІЛ ${ch.number}: ${ch.title}\n${'-'.repeat(50)}\n\n${ch.content}\n`;
        });
        download(content, `${title}.txt`, 'text/plain');
    } else if (format === 'html') {
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{max-width:800px;margin:40px auto;font-family:Georgia,serif;line-height:1.8;padding:20px;background:#f5f5f5}
h1{text-align:center;border-bottom:3px solid #333;padding-bottom:20px}h2{margin-top:60px;color:#333}</style>
</head><body><h1>${title}</h1>`;
        chapters.forEach(ch => {
            html += `<h2>Розділ ${ch.number}: ${ch.title}</h2><div>${ch.content.replace(/\n/g, '<br>')}</div>`;
        });
        html += '</body></html>';
        download(html, `${title}.html`, 'text/html');
    } else if (format === 'epub') {
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>`;
        chapters.forEach(ch => {
            html += `<h2>Розділ ${ch.number}: ${ch.title}</h2><p>${ch.content.replace(/\n/g, '<br>')}</p>`;
        });
        html += '</body></html>';
        download(html, `${title}.epub`, 'application/epub+zip');
    }
    
    showNotification('✅ Книга експортована!', 'success');
}

// Download File
function download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Show Notification
function showNotification(message, type = 'info') {
    alert(message);
}
