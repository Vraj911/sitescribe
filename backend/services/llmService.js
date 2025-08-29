const fetch = require('node-fetch');

function buildSystemPrompt() {
    return 'You are a website content editing planner. ...'; // Keep your previous prompt here
}

function buildUserPrompt(siteIndex, userCommand) {
    const summary = siteIndex.kb
        .slice(0, 30)
        .map(entry => {
            if (entry.type === 'html') {
                const heads = entry.items.filter(i => i.type === 'h1' || i.type === 'h2').slice(0, 3).map(i => i.text);
                return `HTML ${entry.file}: headings=${JSON.stringify(heads)}`;
            }
            return `TEXT ${entry.file}: firstLine=${JSON.stringify(entry.lines[0] || '')}`;
        })
        .join('\n');
    return `User command: ${userCommand}\nSite summary:\n${summary}`;
}

async function tryOpenAI(messages) {
    const key = process.env.OPENAI_API_KEY;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            temperature: 0.1
        })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    try { return JSON.parse(content); } catch { return []; }
}

async function interpretCommand(siteIndex, userCommand) {
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(siteIndex, userCommand) }
    ];

    try {
        const actions = await tryOpenAI(messages);
        if (actions && actions.length) return actions;
    } catch (err) {
        console.log('OpenAI failed:', err.message);
    }

    // fallback: simple heuristic (you can keep your smartCommandInterpreter here)
    return [];
}

module.exports = { interpretCommand };
