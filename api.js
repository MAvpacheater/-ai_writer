// api.js - API комунікація та парсинг JSON

// Агресивний парсер JSON з автовиправленням
function parseJsonSafely(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Порожня відповідь від API');
    }
    
    console.log('=== PARSING JSON ===');
    console.log('Довжина:', text.length);
    console.log('Початок:', text.substring(0, 200));
    
    // Спроба 1: Прямий парсинг
    try {
        return JSON.parse(text);
    } catch (e) {}
    
    // Спроба 2: Видалення markdown
    try {
        let cleaned = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .replace(/^[^{[]*/, '')
            .replace(/[^}\]]*$/, '')
            .trim();
        return JSON.parse(cleaned);
    } catch (e) {}
    
    // Спроба 3: Пошук JSON між дужками
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            let extracted = text.substring(firstBrace, lastBrace + 1);
            
            // Видалення коментарів
            extracted = extracted
                .replace(/\/\/.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/,(\s*[}\]])/g, '$1');
            
            return JSON.parse(extracted);
        }
    } catch (e) {}
    
    // Спроба 4: Витягнення масиву chapters
    try {
        const chaptersMatch = text.match(/"chapters"\s*:\s*\[([\s\S]*?)\](?:\s*[,}])/);
        if (chaptersMatch) {
            let chaptersArray = chaptersMatch[1];
            
            // Додаємо відсутні коми між об'єктами
            chaptersArray = chaptersArray.replace(/}\s*{/g, '},{');
            
            const reconstructed = `{"chapters":[${chaptersArray}]}`;
            return JSON.parse(reconstructed);
        }
    } catch (e) {}
    
    // Спроба 5: Ручне витягнення розділів
    try {
        const chapters = [];
        const chapterPattern = /{[^{}]*"(?:number|Number)"[^{}]*}/g;
        const matches = text.match(chapterPattern);
        
        if (matches && matches.length > 0) {
            for (let match of matches) {
                try {
                    // Виправлення одиничних лапок
                    let fixed = match.replace(/'/g, '"');
                    // Видалення trailing ком
                    fixed = fixed.replace(/,(\s*})/g, '$1');
                    const obj = JSON.parse(fixed);
                    chapters.push(obj);
                } catch (e) {}
            }
            
            if (chapters.length > 0) {
                return { chapters };
            }
        }
    } catch (e) {}
    
    // Спроба 6: Витягнення по рядках
    try {
        const lines = text.split('\n');
        const chapters = [];
        let currentChapter = {};
        
        for (let line of lines) {
            const numMatch = line.match(/"(?:number|Number)"\s*:\s*(\d+)/);
            const titleMatch = line.match(/"(?:title|Title)"\s*:\s*"([^"]+)"/);
            const summaryMatch = line.match(/"(?:summary|Summary|description)"\s*:\s*"([^"]+)"/);
            const eventsMatch = line.match(/"(?:keyEvents|KeyEvents|events)"\s*:\s*\[(.*?)\]/);
            
            if (numMatch) {
                if (currentChapter.number) {
                    chapters.push(currentChapter);
                    currentChapter = {};
                }
                currentChapter.number = parseInt(numMatch[1]);
            }
            if (titleMatch) currentChapter.title = titleMatch[1];
            if (summaryMatch) currentChapter.summary = summaryMatch[1];
            if (eventsMatch) {
                currentChapter.keyEvents = eventsMatch[1]
                    .split(',')
                    .map(e => e.trim().replace(/^"|"$/g, ''))
                    .filter(e => e.length > 0);
            }
        }
        
        if (currentChapter.number) {
            chapters.push(currentChapter);
        }
        
        if (chapters.length > 0) {
            return { chapters };
        }
    } catch (e) {}
    
    console.error('=== FAILED TO PARSE ===');
    console.error('Кінець тексту:', text.substring(text.length - 200));
    throw new Error('Не вдалося розпарсити JSON після всіх спроб. Спробуйте іншу модель або зменшіть кількість розділів.');
}

// Основна функція API виклику
async function callAPI(prompt) {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) {
        throw new Error('Введіть API ключ в налаштуваннях!');
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
        response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
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
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.error?.message || JSON.stringify(data);
            throw new Error(`Gemini API помилка: ${errorMsg}`);
        }
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('API повернув порожню відповідь');
        }
        
        return text;
        
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
            throw new Error(`OpenAI API помилка: ${errorMsg}`);
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
            throw new Error(`Anthropic API помилка: ${errorMsg}`);
        }
        
        return data.content?.[0]?.text || '';
        
    } else if (provider === 'custom') {
        const customUrl = document.getElementById('customUrl').value;
        if (!customUrl) {
            throw new Error('Введіть Custom URL в налаштуваннях');
        }
        
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
            throw new Error(`Custom API помилка: ${JSON.stringify(data)}`);
        }
        
        return data.choices?.[0]?.message?.content || data.content || '';
    }
}

// Тестування API
async function testAPI() {
    try {
        showNotification('⏳ Тестування API...', 'info');
        const result = await callAPI('Напиши одне речення українською про книги.');
        showNotification('✅ API працює коректно!\n\nВідповідь: ' + result.substring(0, 200), 'success');
    } catch (error) {
        console.error('API Test Error:', error);
        showNotification('❌ Помилка API:\n\n' + error.message, 'error');
    }
}
