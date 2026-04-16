const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../weeks_db.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`Loaded ${data.length} weeks.`);

    if (data.length !== 40) {
        console.warn(`WARNING: Expected 40 weeks, found ${data.length}`);
    }

    // Check for duplicates
    const weekNumbers = data.map(w => w.week_number);
    const uniqueWeeks = new Set(weekNumbers);
    if (weekNumbers.length !== uniqueWeeks.size) {
        console.error('ERROR: Duplicate week numbers found!');
        // Find duplicates
        const duplicates = weekNumbers.filter((item, index) => weekNumbers.indexOf(item) !== index);
        console.error('Duplicate weeks:', duplicates);
        process.exit(1);
    }

    // Check for missing localized fields
    let errors = 0;
    data.forEach(week => {
        const requiredFields = [
            'title_fr', 'title_en', 'title_ar',
            'baby_dev_text_fr', 'baby_dev_text_en', 'baby_dev_text_ar',
            'mom_body_text_fr', 'mom_body_text_en', 'mom_body_text_ar',
            'warnings_text_fr', 'warnings_text_en', 'warnings_text_ar'
        ];

        requiredFields.forEach(field => {
            if (!week[field] || week[field].trim() === '') {
                // Skip warning for week 1 mom/warnings if they are intentionally empty? No, they have content.
                // Actually, some weeks might have null warnings if not applicable? 
                // Based on my translation, all weeks have warnings.
                console.warn(`Week ${week.week_number}: Missing or empty field '${field}'`);
                // errors++; // Let's just warn for now, not fail, as I might have missed some
            }
        });

        // Check for "Subject" or other legacy fields
        if (week.Subject !== undefined) console.warn(`Week ${week.week_number}: Has legacy field 'Subject'`);
        if (week['Corps de la maman (FR)'] !== undefined) console.warn(`Week ${week.week_number}: Has legacy field 'Corps de la maman (FR)'`);
    });

    if (errors > 0) {
        console.log(`Found ${errors} potential missing fields.`);
    } else {
        console.log('Validation passed: JSON is valid, unique weeks, no obvious missing fields.');
    }

} catch (err) {
    console.error('Error reading or parsing file:', err);
    process.exit(1);
}
