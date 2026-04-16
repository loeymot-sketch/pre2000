const fs = require('fs');
const path = require('path');

const destPath = path.join(__dirname, '../../articles_db.json');
const srcPath = path.join(__dirname, '../../articles_antigravity.json');

const articlesDb = JSON.parse(fs.readFileSync(destPath, 'utf8'));
const articlesAnti = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// Only add if not already present
const existingIds = new Set(articlesDb.map(a => a.article_id));

let added = 0;
articlesAnti.forEach(a => {
    if (!existingIds.has(a.article_id)) {
        const newArt = {
            article_id: a.article_id,
            slug: a.title_fr.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            title_fr: a.title_fr,
            title_ar: a.title_ar,
            title_en: a.title_en || a.title_fr,
            title_tn: a.title_ar, // fallback to AR for TN initially
            category: a.category,
            summary_fr: a.summary_fr,
            summary_ar: a.summary_ar,
            summary_en: a.summary_en || a.summary_fr,
            summary_tn: a.summary_ar, // fallback
            content_source_path: `${a.article_id}.md`,
            language: "fr",
            risk_level: "normal",
            week_links: "",
            related_articles_ids: "",
            related_supplements_ids: "",
            note_localisation: "",
            content_markdown_fr: a.content_fr,
            content_markdown_en: a.content_en || a.content_fr,
            content_markdown_ar: a.content_ar,
            content_markdown_tn: a.content_ar // fallback
        };
        articlesDb.push(newArt);
        added++;
    }
});

fs.writeFileSync(destPath, JSON.stringify(articlesDb, null, 2));
console.log(`Merged ${added} new articles into articles_db.json. New total: ${articlesDb.length}`);
