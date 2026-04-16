const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../articles_db.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`Loaded ${data.length} articles.`);

    let errors = 0;
    data.forEach(article => {
        const requiredFields = ['title_fr', 'title_en', 'title_ar', 'summary_fr', 'summary_en', 'summary_ar'];

        requiredFields.forEach(field => {
            if (!article[field] || article[field].trim() === '') {
                console.error(`Error: Article '${article.article_id}' is missing field '${field}'`);
                errors++;
            }
        });

        // Check markdown header retention
        if (article.summary_en && !article.summary_en.startsWith('# ')) {
            console.warn(`Warning: Article '${article.article_id}' summary_en might have lost its Markdown header.`);
        }
        if (article.summary_ar && !article.summary_ar.startsWith('# ')) {
            console.warn(`Warning: Article '${article.article_id}' summary_ar might have lost its Markdown header.`);
        }
    });

    if (errors > 0) {
        console.error(`Found ${errors} errors.`);
        process.exit(1);
    } else {
        console.log('Validation passed: All articles have translated titles and summaries.');
    }

} catch (err) {
    console.error('Error reading or parsing file:', err);
    process.exit(1);
}
