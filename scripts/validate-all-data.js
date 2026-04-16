const fs = require('fs');
const path = require('path');

const files = [
    { name: 'weeks_db.json', required: ['title_fr', 'title_en', 'title_ar'] },
    { name: 'articles_db.json', required: ['title_fr', 'title_en', 'title_ar', 'summary_fr', 'summary_en', 'summary_ar'] },
    { name: 'red_flags_db.json', required: ['label_fr', 'label_en', 'label_ar', 'standard_message_fr', 'standard_message_en', 'standard_message_ar'] },
    { name: 'chatbot_suggestions.json', required: ['label_fr', 'label_en', 'label_ar'] }
];

let totalErrors = 0;

console.log('🔍 Starting comprehensive data validation...\n');

files.forEach(file => {
    const filePath = path.join(__dirname, '../', file.name);
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing file: ${file.name}`);
            totalErrors++;
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        console.log(`Checking ${file.name} (${data.length} items)...`);

        let fileErrors = 0;
        data.forEach((item, index) => {
            file.required.forEach(field => {
                if (!item[field] || (typeof item[field] === 'string' && item[field].trim() === '')) {
                    console.error(`   ❌ Item #${index} missing '${field}'`);
                    fileErrors++;
                }
            });
        });

        if (fileErrors === 0) {
            console.log(`   ✅ Valid`);
        } else {
            console.error(`   ❌ Found ${fileErrors} missing fields`);
            totalErrors += fileErrors;
        }

    } catch (err) {
        console.error(`❌ Error processing ${file.name}:`, err.message);
        totalErrors++;
    }
});

console.log('\n' + '='.repeat(40));
if (totalErrors === 0) {
    console.log('🎉 ALL DATA FILES ARE FULLY LOCALIZED AND VALID!');
    process.exit(0);
} else {
    console.error(`💥 Found ${totalErrors} total errors.`);
    process.exit(1);
}
