const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../../');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.json') && f.includes('article'));

files.forEach(file => {
    try {
        const filePath = path.join(rootDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(data)) {
            const untranslated = data.filter(a => {
                const contentAr = a.content_markdown_ar || a.content_ar;
                return !a.title_ar || !contentAr || a.title_ar === a.title_fr;
            });
            console.log(`[${file}] Found ${untranslated.length} untranslated articles`);
            if (untranslated.length > 0) {
                untranslated.slice(0, 5).forEach(a => console.log(`  - ${a.article_id || a.slug} (${a.title_fr})`));
            }
        }
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});
