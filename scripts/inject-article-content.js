const fs = require('fs');
const path = require('path');

const PARTICLES_DIR = path.join(__dirname, '../articles');
const DB_PATH = path.join(__dirname, '../articles_db.json');
const BACKUP_PATH = path.join(__dirname, '../articles_db.backup.json');

// Create backup
if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log(`✅ Backup created at ${BACKUP_PATH}`);
} else {
    console.error(`❌ DB file not found at ${DB_PATH}`);
    process.exit(1);
}

const articles = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
let updatedCount = 0;

console.log(`🔍 Processing ${articles.length} articles...`);

const updatedArticles = articles.map(article => {
    const sourceFile = article.content_source_path;
    if (!sourceFile) {
        console.warn(`⚠️ Article ${article.article_id} has no content_source_path`);
        return article;
    }

    // Paths
    const frPath = path.join(PARTICLES_DIR, sourceFile);
    const enPath = path.join(PARTICLES_DIR, sourceFile.replace('.md', '_en.md'));
    const arPath = path.join(PARTICLES_DIR, sourceFile.replace('.md', '_ar.md'));

    // Read content
    let contentFr = '';
    let contentEn = '';
    let contentAr = '';

    // FR (Source)
    if (fs.existsSync(frPath)) {
        contentFr = fs.readFileSync(frPath, 'utf8');
    } else {
        console.error(`❌ FR file missing: ${frPath}`);
    }

    // EN
    if (fs.existsSync(enPath)) {
        contentEn = fs.readFileSync(enPath, 'utf8');
    } else {
        console.warn(`⚠️ EN file missing: ${enPath}`);
    }

    // AR
    if (fs.existsSync(arPath)) {
        contentAr = fs.readFileSync(arPath, 'utf8');
    } else {
        console.warn(`⚠️ AR file missing: ${arPath}`);
    }

    // Update article object
    return {
        ...article,
        content_markdown_fr: contentFr,
        content_markdown_en: contentEn,
        content_markdown_ar: contentAr
    };
});

// Write updated DB
fs.writeFileSync(DB_PATH, JSON.stringify(updatedArticles, null, 2));
console.log(`\n✨ Successfully updated articles_db.json with markdown content.`);
