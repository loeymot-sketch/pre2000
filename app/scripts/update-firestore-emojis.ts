/**
 * Script pour mettre à jour les emojis dans Firestore
 * 
 * USAGE: 
 * 1. Installer firebase-admin: npm install firebase-admin
 * 2. Télécharger votre clé de service depuis Firebase Console
 * 3. Définir la variable d'environnement: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
 * 4. Exécuter: npx ts-node scripts/update-firestore-emojis.ts
 */

// Les corrections à appliquer
const EMOJI_CORRECTIONS: { [week: number]: string } = {
    4: "🌰",   // Graine de pavot
    5: "🌾",   // Graine de sésame  
    6: "🟤",   // Lentille
    7: "🫐",   // Myrtille
    8: "🍇",   // Framboise
    9: "🫒",   // Olive
    10: "🍑", // Prune
    11: "🍇", // Figue
    13: "🍑", // Pêche
    14: "🍋", // Citron
    15: "🍎", // Pomme
    18: "🫑", // Poivron
    19: "🥭", // Mangue
    20: "🍌", // Banane
    21: "🥕", // Carotte
    22: "🍈", // Papaye
    23: "🍆", // Aubergine
    24: "🌽", // Maïs
    25: "🥦", // Chou-fleur
    26: "🥬", // Chou
    27: "🥬", // Chou-rave
    28: "🍆", // Aubergine
    29: "🎃", // Butternut
    30: "🥬", // Chou
    31: "🥥", // Noix de coco
    32: "🥬", // Chou frisé
    33: "🍍", // Ananas
    34: "🍈", // Melon
    35: "🍈", // Melon miel
    36: "🥬", // Chou romaine
    37: "🥬", // Céleri
    38: "🎃", // Citrouille
    39: "🍉", // Pastèque
};

async function updateFirestoreEmojis() {
    console.log('📦 Loading Firebase Admin SDK...');

    try {
        const admin = require('firebase-admin');

        // Initialize Firebase Admin
        if (!admin.apps.length) {
            admin.initializeApp();
        }

        const db = admin.firestore();

        console.log('🔄 Updating emojis in Firestore...\n');

        for (const [weekStr, emoji] of Object.entries(EMOJI_CORRECTIONS)) {
            const week = parseInt(weekStr, 10);
            const docRef = db.collection('weeks').doc(String(week));

            await docRef.update({ emoji });
            console.log(`  ✅ Week ${week}: ${emoji}`);
        }

        console.log('\n✅ All updates complete!');
    } catch (error: any) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log('\n❌ firebase-admin not installed.');
            console.log('   Run: npm install firebase-admin');
            console.log('\n📋 MANUAL UPDATE:');
            console.log('   Go to Firebase Console > Firestore > weeks collection');
            console.log('   Update the "emoji" field for each week listed above.\n');

            console.log('   Or copy this to a browser console with Firebase loaded:\n');
            console.log('   ────────────────────────────────────────────────');
            for (const [week, emoji] of Object.entries(EMOJI_CORRECTIONS)) {
                console.log(`   db.collection('weeks').doc('${week}').update({ emoji: '${emoji}' });`);
            }
        } else {
            console.error('Error:', error);
        }
    }
}

// Print summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('  EMOJI CORRECTIONS FOR FIRESTORE');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Semaine | Emoji | Description');
console.log('────────┼───────┼─────────────────────────────');
const descriptions: { [key: number]: string } = {
    4: 'Graine de pavot', 5: 'Graine de sésame', 6: 'Lentille', 7: 'Myrtille',
    8: 'Framboise', 9: 'Olive', 10: 'Prune', 11: 'Figue', 13: 'Pêche',
    14: 'Citron', 15: 'Pomme', 18: 'Poivron', 19: 'Mangue', 20: 'Banane',
    21: 'Carotte', 22: 'Papaye', 23: 'Aubergine', 24: 'Maïs', 25: 'Chou-fleur',
    26: 'Chou', 27: 'Chou-rave', 28: 'Aubergine', 29: 'Butternut', 30: 'Chou',
    31: 'Noix de coco', 32: 'Chou frisé', 33: 'Ananas', 34: 'Melon',
    35: 'Melon miel', 36: 'Chou romaine', 37: 'Céleri', 38: 'Citrouille',
    39: 'Pastèque'
};

for (const [week, emoji] of Object.entries(EMOJI_CORRECTIONS)) {
    const desc = descriptions[parseInt(week, 10)] || '';
    console.log(`   ${week.padStart(2)}    │   ${emoji}   │ ${desc}`);
}

console.log('\n═══════════════════════════════════════════════════════════════\n');

// Run update
updateFirestoreEmojis();
