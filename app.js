// app.js - Головна логіка програми

// ===== STORAGE =====
const Storage = {
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    load: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    clear: (key) => localStorage.removeItem(key)
};

// ===== ГЛОБАЛЬНІ ЗМІННІ =====
let outline = null;
let chapters = [];
let context = { events: [], lastChapter: 0 };
let isGenerating = false;

// ===== ІНІЦІАЛІЗАЦІЯ =====
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    updateHeaderStats();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Sliders
    const sliders = [
        { id: 'temperature', valueId: 'tempValue' },
        { id: 'maxTokens', valueId: 'maxTokensValue' },
        { id: 'chaptersCount', valueId: 'chaptersValue' },
        { id: 'chapterLength', valueId: 'chapterLengthValue' }
    ];
    
    sliders.forEach(({ id, valueId }) => {
        const element = document.getElementById(id);
        const valueElement = document.getElementById(valueId);
        if (element && valueElement) {
            element.addEventListener('input', (e) => {
                valueElement.textContent = e.target.value;
            });
        }
    });
    
    // API Provider
    const providerSelect = document.getElementById('apiProvider');
    if (providerSelect) {
        providerSelect.addEventListener('change', handleProviderChange);
    }
}

// ===== PROVIDER CHANGE =====
function handleProviderChange(e) {
    const provider = e.target.value;
    const modelSelect = document.getElementById('modelName');
    const customBlock = document.getElementById('customUrlBlock');
    
    modelSelect.innerHTML = '';
    customBlock.style.display = 'none';
    
    const models = {
        gemini: [
            { value: 'gemini-2.5-flash', text: 'Gemini 2.5 Flash - Text/Image (250K TPM) 🔥' },
            { value: 'gemini-2.0-flash', text: 'Gemini 2.0 Flash - Text/Image (1M TPM)' },
            { value: 'gemini-2.5-flash-lite', text: 'Gemini 2.5 Flash Lite - Text/Image (250K TPM)' },
            { value: 'gemini-2.0-flash-lite', text: 'Gemini 2.0 Flash Lite - Text/Image (1M TPM)' },
            { value: 'gemma-3-27b', text: 'Gemma 3 27B - Text Only' },
            { value: 'gemma-3-12b', text: 'Gemma 3 12B - Text Only' },
            { value: 'gemma-3-4b', text: 'Gemma 3 4B - Text Only' },
            { value: 'gemma-3-2b', text: 'Gemma 3 2B - Text Only' },
            { value: 'gemma-3-1b', text: 'Gemma 3 1B - Text Only' }
        ],
        openai: [
            { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
            { value: 'gpt-4', text: 'GPT-4' },
            { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
        ],
        anthropic: [
            { value: 'claude-3-opus-20240229', text: 'Claude 3 Opus' },
            { value: 'claude-3-sonnet-20240229', text: 'Claude 3 Sonnet' }
        ],
        custom: [
            { value: 'custom', text: 'Custom Model' }
        ]
    };
    
    models[provider].forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.text;
        modelSelect.appendChild(option);
    });
    
    if (provider === 'custom') {
        customBlock.style.display = 'block';
    }
}

// ===== SETTINGS =====
function loadSettings() {
    const saved = Storage.load('aiwriter_settings');
    if (saved) {
        const fields = ['apiProvider', 'modelName', 'apiKey', 'customUrl', 'temperature', 
                       'maxTokens', 'title', 'genre', 'style', 'characters', 
                       'mainIdea', 'chaptersCount', 'chapterLength'];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && saved[field] !== undefined) {
                element.value = saved[field];
            }
        });
        
        // Update sliders
        ['temperature', 'maxTokens', 'chaptersCount', 'chapterLength'].forEach(id => {
            const element = document.getElementById(id);
            const valueElement = document.getElementById(id + 'Value');
            if (element && valueElement) {
                valueElement.textContent = element.value;
            }
        });
        
        // Trigger provider change FIRST to populate models
        const providerElement = document.getElementById('apiProvider');
        if (providerElement) {
            handleProviderChange({ target: providerElement });
            // THEN set the saved model
            const modelElement = document.getElementById('modelName');
            if (modelElement && saved.modelName) {
                modelElement.value = saved.modelName;
            }
        }
    } else {
        // Default setup for first time users
        const providerElement = document.getElementById('apiProvider');
        if (providerElement) {
            handleProviderChange({ target: providerElement });
        }
    }
    
    const savedBook = Storage.load('aiwriter_book');
    if (savedBook) {
        outline = savedBook.outline;
        chapters = savedBook.chapters || [];
        context = savedBook.context || { events: [], lastChapter: 0 };
        updateHeaderStats();
    }
}

function saveSettings() {
    const settings = {
        apiProvider: document.getElementById('apiProvider').value,
        modelName: document.getElementById('modelName').value,
        apiKey: document.getElementById('apiKey').value,
        customUrl: document.getElementById('customUrl').value,
        temperature: document.getElementById('temperature').value,
        maxTokens: document.getElementById('maxTokens').value,
        title: document.getElementById('title').value,
        genre: document.getElementById('genre').value,
        style: document.getElementById('style').value,
        characters: document.getElementById('characters').value,
        mainIdea: document.getElementById('mainIdea').value,
        chaptersCount: document.getElementById('chaptersCount').value,
        chapterLength: document.getElementById('chapterLength').value
    };
    
    Storage.save('aiwriter_settings', settings);
    showToast('Налаштування збережено!', 'success');
}

function saveBook() {
    Storage.save('aiwriter_book', { outline, chapters, context });
}

// ===== TABS =====
function switchTab(tab) {
    const tabs = ['setup', 'outline', 'generate', 'export'];
    
    tabs.forEach(t => {
        const content = document.getElementById('content-' + t);
        const button = document.getElementById('tab-' + t);
        
        if (content) content.classList.remove('active');
        if (button) button.classList.remove('active', 'completed');
    });
    
    const activeContent = document.getElementById('content-' + tab);
    const activeButton = document.getElementById('tab-' + tab);
    
    if (activeContent) activeContent.classList.add('active');
    if (activeButton) activeButton.classList.add('active');
    
    // Update completed states
    const tabOrder = ['setup', 'outline', 'generate', 'export'];
    const currentIndex = tabOrder.indexOf(tab);
    tabOrder.forEach((t, i) => {
        const btn = document.getElementById('tab-' + t);
        if (btn && i < currentIndex) {
            btn.classList.add('completed');
        }
    });
    
    // Tab-specific actions
    if (tab === 'generate') {
        displayGenerateContent();
    } else if (tab === 'export') {
        updateExportStatus();
        updatePreview();
    }
}

// ===== API CALL =====
async function callAPI(prompt) {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) {
        throw new Error('Введіть API ключ в налаштуваннях!');
    }

    const provider = document.getElementById('apiProvider').value;
    const model = document.getElementById('modelName').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('maxTokens').value);

    let response;
    
    if (provider === 'gemini') {
        response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxTokens
                    }
                })
            }
        );
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Gemini API: ${data.error?.message || JSON.stringify(data)}`);
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
                temperature: temperature,
                max_tokens: maxTokens
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`OpenAI API: ${data.error?.message}`);
        }
        return data.choices?.[0]?.message?.content || '';
    }
    
    throw new Error('Provider не підтримується');
}

// ===== TEST API =====
async function testAPI() {
    try {
        showToast('Тестування API...', 'info');
        const result = await callAPI('Напиши одне речення українською про книги.');
        showToast('✅ API працює коректно!\n\nВідповідь: ' + result.substring(0, 200), 'success');
    } catch (error) {
        console.error('API Test Error:', error);
        showToast('❌ Помилка API: ' + error.message, 'error');
    }
}

// ===== PARSE JSON =====
function parseJsonSafely(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Порожня відповідь від API');
    }
    
    console.log('Parsing JSON, length:', text.length);
    
    // Try 1: Direct parsing
    try {
        return JSON.parse(text);
    } catch (e) {}
    
    // Try 2: Remove markdown
    try {
        let cleaned = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .replace(/^[^{[]*/, '')
            .replace(/[^}\]]*$/, '')
            .trim();
        return JSON.parse(cleaned);
    } catch (e) {}
    
    // Try 3: Extract between braces
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            let extracted = text.substring(firstBrace, lastBrace + 1)
                .replace(/\/\/.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/,(\s*[}\]])/g, '$1');
            return JSON.parse(extracted);
        }
    } catch (e) {}
    
    throw new Error('Не вдалося розпарсити JSON. Спробуйте іншу модель або зменшіть кількість розділів.');
}

// ===== GENERATE OUTLINE =====
async function generateOutline() {
    const btn = document.getElementById('btnOutline');
    const title = document.getElementById('title').value;
    const genre = document.getElementById('genre').value;
    const chaptersCount = parseInt(document.getElementById('chaptersCount').value);
    
    if (!title || !genre) {
        showToast('❌ Заповніть назву та жанр книги!', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Генерація...';
    isGenerating = true;

    try {
        const prompt = `You are a professional book outline generator.

CRITICAL: Generate EXACTLY ${chaptersCount} chapters in a SINGLE response.

Book details:
- Title: ${title}
- Genre: ${genre}
- Total chapters: ${chaptersCount}

Return ONLY valid JSON (no markdown, no text before/after):

{
  "chapters": [
    {
      "number": 1,
      "title": "Назва першого розділу українською",
      "summary": "Детальний опис розділу українською (2-3 речення)",
      "keyEvents": ["подія 1", "подія 2", "подія 3"]
    },
    ...continue for all ${chaptersCount} chapters...
  ]
}

Generate ALL ${chaptersCount} chapters from 1 to ${chaptersCount}. All text in Ukrainian.`;

        console.log('Generating outline for', chaptersCount, 'chapters...');
        const result = await callAPI(prompt);
        
        outline = parseJsonSafely(result);
        
        if (!outline.chapters || !Array.isArray(outline.chapters)) {
            throw new Error('Invalid outline structure');
        }
        
        // Normalize chapters
        outline.chapters = outline.chapters.map((ch, idx) => ({
            number: parseInt(ch.number || (idx + 1)),
            title: String(ch.title || `Розділ ${idx + 1}`).trim(),
            summary: String(ch.summary || '').trim(),
            keyEvents: Array.isArray(ch.keyEvents) ? ch.keyEvents : []
        }));
        
        console.log('✅ Outline created:', outline.chapters.length, 'chapters');
        
        saveBook();
        displayOutline();
        updateHeaderStats();
        
        showToast(`✅ Outline створено! Розділів: ${outline.chapters.length}`, 'success');
        
    } catch (error) {
        console.error('Outline generation error:', error);
        showToast('❌ Помилка: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '▶️ Згенерувати outline';
        isGenerating = false;
    }
}

// ===== DISPLAY OUTLINE =====
function displayOutline() {
    const container = document.getElementById('outlineContent');
    if (!container) return;
    
    if (!outline || !outline.chapters || outline.chapters.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-secondary);">Outline ще не створено. Заповніть налаштування та натисніть "Згенерувати outline".</p>';
        return;
    }
    
    container.innerHTML = outline.chapters.map(ch => `
        <div style="background: var(--color-bg-secondary); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1rem; border-left: 3px solid var(--color-accent);">
            <h3 style="color: var(--color-accent); margin-bottom: 0.5rem; font-size: 1.1rem;">Розділ ${ch.number}: ${ch.title}</h3>
            <p style="color: var(--color-text-secondary); margin-bottom: 0.5rem;">${ch.summary}</p>
            ${ch.keyEvents && ch.keyEvents.length > 0 ? `<p style="color: var(--color-text-tertiary); font-size: 0.875rem;">Події: ${ch.keyEvents.join(', ')}</p>` : ''}
        </div>
    `).join('');
}

// ===== GENERATE CHAPTER =====
async function generateChapter(chapterNumber) {
    if (!outline || !outline.chapters) {
        showToast('❌ Спочатку створіть outline!', 'error');
        return;
    }
    
    const chapterInfo = outline.chapters.find(ch => ch.number === chapterNumber);
    if (!chapterInfo) {
        showToast('❌ Розділ не знайдено!', 'error');
        return;
    }
    
    const btnId = `btn-ch-${chapterNumber}`;
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Генерація...';
    }

    try {
        const settings = Storage.load('aiwriter_settings');
        const chapterLength = settings.chapterLength || 2000;
        
        const prompt = `You are a professional creative writer. Write a complete literary chapter in UKRAINIAN language.

CHAPTER ${chapterInfo.number}: "${chapterInfo.title}"

PLOT: ${chapterInfo.summary}
KEY EVENTS: ${chapterInfo.keyEvents?.join(', ') || 'none'}

PARAMETERS:
- Genre: ${settings.genre}
- Style: ${settings.style}
- Length: approximately ${chapterLength} words

CRITICAL INSTRUCTIONS:
1. Write ONLY the story text in proper Ukrainian
2. NO titles, NO chapter numbers
3. Start directly with narrative
4. Create atmosphere and vivid descriptions
5. Divide text into paragraphs

Begin writing:`;

        const content = await callAPI(prompt);
        
        if (!content || content.trim().length < 100) {
            throw new Error('Текст занадто короткий');
        }
        
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
        context.events = [...context.events, ...(chapterInfo.keyEvents || [])];
        
        saveBook();
        
        if (btn) {
            btn.textContent = '✅ Готово';
            btn.classList.add('btn-success');
        }
        
        updateHeaderStats();
        displayGenerateContent();
        
        showToast(`✅ Розділ ${chapterNumber} згенеровано!`, 'success');
        
    } catch (error) {
        console.error('Chapter generation error:', error);
        showToast('❌ Помилка: ' + error.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Згенерувати';
        }
    }
}

// ===== DISPLAY GENERATE CONTENT =====
function displayGenerateContent() {
    const container = document.getElementById('generateContent');
    if (!container) return;
    
    if (!outline || !outline.chapters) {
        container.innerHTML = '<p style="color: var(--color-text-secondary);">Спочатку створіть outline на вкладці "Структура"</p>';
        return;
    }
    
    const completedCount = chapters.length;
    const totalCount = outline.chapters.length;
    
    let html = `
        <div style="background: var(--color-accent-light); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 2rem; border: 1px solid var(--color-accent);">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--color-accent);">Прогрес генерації</h3>
            <p style="margin: 0; font-size: 1.1rem;">Згенеровано: <strong style="color: var(--color-accent);">${completedCount}/${totalCount}</strong> розділів</p>
        </div>
    `;
    
    html += outline.chapters.map(ch => {
        const isGenerated = chapters.find(c => c.number === ch.number);
        
        return `
            <div style="background: var(--color-bg-secondary); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.1rem;">Розділ ${ch.number}: ${ch.title}</h3>
                    ${!isGenerated 
                        ? `<button onclick="generateChapter(${ch.number})" id="btn-ch-${ch.number}" class="btn btn-primary btn-sm">Згенерувати</button>`
                        : '<span style="color: var(--color-success); font-weight: 600;">✅ Готово</span>'
                    }
                </div>
                ${isGenerated 
                    ? `<div style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.6;">${isGenerated.content.substring(0, 300)}...</div>` 
                    : `<p style="color: var(--color-text-tertiary); font-size: 0.875rem; margin: 0;">${ch.summary}</p>`
                }
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ===== EXPORT =====
function updateExportStatus() {
    const statusElement = document.getElementById('exportStatus');
    const headerElement = document.getElementById('headerChaptersCount');
    const total = outline?.chapters?.length || 0;
    const completed = chapters.length;
    const status = `${completed}/${total}`;
    
    if (statusElement) statusElement.textContent = status;
    if (headerElement) headerElement.textContent = status;
}

function updateHeaderStats() {
    updateExportStatus();
}

function updatePreview() {
    const container = document.getElementById('previewContent');
    if (!container) return;
    
    if (chapters.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-secondary);">Немає згенерованих розділів для перегляду</p>';
        return;
    }
    
    container.innerHTML = chapters
        .sort((a, b) => a.number - b.number)
        .map(ch => `
            <div style="margin-bottom: 3rem;">
                <h3 style="color: var(--color-accent); margin-bottom: 1rem; font-size: 1.2rem;">Розділ ${ch.number}: ${ch.title}</h3>
                <div style="color: var(--color-text-secondary); line-height: 1.8; white-space: pre-wrap;">${ch.content}</div>
            </div>
        `).join('');
}

function exportBook(format) {
    if (chapters.length === 0) {
        showToast('⚠️ Немає розділів для експорту!', 'warning');
        return;
    }

    const settings = Storage.load('aiwriter_settings');
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
        body { max-width: 800px; margin: 40px auto; font-family: Georgia, serif; line-height: 1.8; padding: 20px; }
        h1 { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; }
        h2 { margin-top: 60px; color: #333; }
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
    }
    
    showToast(`✅ Книгу "${title}" експортовано у форматі ${format.toUpperCase()}!`, 'success');
}

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

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ===== ANIMATIONS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
