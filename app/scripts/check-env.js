const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

console.log('🔍 Checking Environment Configuration...');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const missingKeys = [];

// Critical Keys for Production
const requiredKeys = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_SENTRY_DSN'
];

requiredKeys.forEach(key => {
    if (!envContent.includes(key)) {
        missingKeys.push(key);
    }
});

if (missingKeys.length > 0) {
    console.warn('⚠️  WARNING: Missing Critical Environment Variables:');
    missingKeys.forEach(key => console.warn(`   - ${key}`));
    console.warn('\nBuild will succeed but some features (Crash Reporting, Auth) may fail.');
    process.exit(0); // Soft fail for now
} else {
    console.log('✅ Environment Config works! Ready for Build.');
}
