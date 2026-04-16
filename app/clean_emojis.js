const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src/i18n/locales');
const languages = ['fr', 'en', 'ar', 'tn'];
const namespaces = ['profile', 'common'];

// Basic emoji regex covering our explicit targets and general emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}\u{2B50}\u{2B55}\u{FE0F}]/gu;

languages.forEach(lang => {
    namespaces.forEach(ns => {
        const filePath = path.join(localesDir, lang, `${ns}.json`);
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            // Remove emojis and trim leftover starting spaces
            const newContent = content.replace(emojiRegex, '').replace(/": "\s+/g, '": "');
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Cleaned ${lang}/${ns}.json`);
        }
    });
});
