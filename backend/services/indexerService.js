const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

function safeRead(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (_) {
        return '';
    }
}

function buildSelector($el) {
    const parts = [];
    let node = $el;
    while (node && node.length && node[0].type === 'tag') {
        const tag = node[0].name;
        const id = node.attr('id');
        const cls = (node.attr('class') || '').split(/\s+/).filter(Boolean);
        let part = tag;
        if (id) part += `#${id}`;
        if (cls.length) part += `.${cls.join('.')}`;
        parts.unshift(part);
        node = node.parent();
        if (!node || !node.length || node[0].name === 'html') break;
    }
    return parts.join(' > ');
}

function indexHtml(filePath, html) {
    const $ = cheerio.load(html);
    const items = [];
    $('h1, h2, h3, p, img, a, span, div').each((_, el) => {
        const tag = el.tagName;
        const text = $(el).text().trim();
        const id = $(el).attr('id') || null;
        const className = $(el).attr('class') || null;
        const src = $(el).attr('src') || null;
        const href = $(el).attr('href') || null;
        const selector = buildSelector($(el));
        items.push({ type: tag, text, id, className, src, href, selector, file: filePath });
    });
    return { file: filePath, type: 'html', items };
}

function indexText(filePath, content) {
    const lines = content.split(/\r?\n/);
    return { file: filePath, type: 'text', lines: lines.slice(0, 500) };
}

function indexSite(inputPath) {
    try {
        console.log('Indexing site at:', inputPath);
        const stats = fs.statSync(inputPath);
        let files = [];

        if (stats.isFile()) {
            if (/\.(html?|css|md)$/i.test(inputPath)) files = [inputPath];
            else return { rootDir: path.dirname(inputPath), files: [], kb: [] };
        } else if (stats.isDirectory()) {
            function walk(dir) {
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = path.join(dir, entry);
                    if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
                    else if (/\.(html?|css|md)$/i.test(entry)) files.push(fullPath);
                }
            }
            walk(inputPath);
        }

        const kb = files.map(f => {
            const content = safeRead(f);
            return /\.html?$/i.test(f) ? indexHtml(f, content) : indexText(f, content);
        });

        const result = { rootDir: path.dirname(inputPath), files, kb };
        console.log('Site indexing completed:', result);
        return result;
    } catch (error) {
        console.error('Error in indexSite:', error);
        throw error;
    }
}

module.exports = { indexSite };
