/**
 * WEEK EMOJI/COMPARISON CORRECTIONS
 * 
 * This file contains the correct data to upload to Firestore 'weeks' collection.
 * 
 * HOW TO USE:
 * 1. Go to Firebase Console > Firestore
 * 2. Select the 'weeks' collection
 * 3. For each week document, update the 'emoji' field with the correct value below
 * 
 * Or import this data using the Firebase Admin SDK (requires firebase-admin package)
 */

// Correct emoji mappings for each week
export const CORRECT_WEEK_DATA: { [week: number]: { emoji: string; label_fr: string } } = {
    1: { emoji: '🌱', label_fr: 'Microscopique' },
    2: { emoji: '🌱', label_fr: 'Microscopique' },
    3: { emoji: '🌱', label_fr: 'Microscopique' },
    4: { emoji: '🌰', label_fr: 'Graine de pavot (1 mm)' },
    5: { emoji: '🌾', label_fr: 'Graine de sésame (2 mm)' },
    6: { emoji: '🍚', label_fr: 'Lentille (4 mm)' },
    7: { emoji: '🫐', label_fr: 'Myrtille (8 mm)' },
    8: { emoji: '🍇', label_fr: 'Framboise (1,6 cm)' },
    9: { emoji: '🫒', label_fr: 'Olive (2,3 cm)' },
    10: { emoji: '🫐', label_fr: 'Prune (3,1 cm)' },
    11: { emoji: '🍈', label_fr: 'Figue (4,1 cm)' },
    12: { emoji: '🍋', label_fr: 'Citron vert (5,4 cm)' },
    13: { emoji: '🍑', label_fr: 'Pêche (7,4 cm)' },
    14: { emoji: '🍋', label_fr: 'Citron (8,7 cm)' },
    15: { emoji: '🍎', label_fr: 'Pomme (10,1 cm)' },
    16: { emoji: '🥑', label_fr: 'Avocat (16 cm)' },
    17: { emoji: '🍐', label_fr: 'Poire (13 cm)' },
    18: { emoji: '🫑', label_fr: 'Poivron (14,2 cm)' },  // ⚠️ FIXED: was 🍐
    19: { emoji: '🥭', label_fr: 'Mangue (15,3 cm)' },   // ⚠️ FIXED: was 🍐
    20: { emoji: '🍌', label_fr: 'Banane (16,4 cm)' },   // ⚠️ FIXED: was 🍐
    21: { emoji: '🥕', label_fr: 'Carotte (26,7 cm)' },  // ⚠️ FIXED: was 🥭
    22: { emoji: '🍈', label_fr: 'Papaye (27,8 cm)' },   // ⚠️ FIXED: was 🥭
    23: { emoji: '🍆', label_fr: 'Aubergine (28,9 cm)' }, // ⚠️ FIXED: was 🥭
    24: { emoji: '🌽', label_fr: 'Maïs (30 cm)' },       // ⚠️ FIXED: was 🥭
    25: { emoji: '🥦', label_fr: 'Chou-fleur (34,6 cm)' }, // ⚠️ FIXED: was 🥥
    26: { emoji: '🥬', label_fr: 'Chou (35,6 cm)' },     // ⚠️ FIXED: was 🥥
    27: { emoji: '🥬', label_fr: 'Chou-rave (36,6 cm)' }, // ⚠️ FIXED: was 🥥
    28: { emoji: '🍆', label_fr: 'Aubergine (37,6 cm)' }, // ⚠️ FIXED: was 🥥
    29: { emoji: '🎃', label_fr: 'Butternut (38,6 cm)' }, // ⚠️ FIXED: was 🍉
    30: { emoji: '🥬', label_fr: 'Chou (39,9 cm)' },     // ⚠️ FIXED: was 🍉
    31: { emoji: '🥥', label_fr: 'Noix de coco (41,1 cm)' }, // ⚠️ FIXED: was 🍉
    32: { emoji: '🥬', label_fr: 'Chou frisé (42,4 cm)' }, // ⚠️ FIXED: was 🍉
    33: { emoji: '🍍', label_fr: 'Ananas (43,7 cm)' },   // ⚠️ FIXED: was 🎃
    34: { emoji: '🍈', label_fr: 'Melon (45 cm)' },      // ⚠️ FIXED: was 🎃
    35: { emoji: '🍈', label_fr: 'Melon miel (46,2 cm)' }, // ⚠️ FIXED: was 🎃
    36: { emoji: '🥬', label_fr: 'Chou romaine (47,4 cm)' }, // ⚠️ FIXED: was 🎃
    37: { emoji: '🥬', label_fr: 'Céleri (48,6 cm)' },
    38: { emoji: '🎃', label_fr: 'Citrouille (49,8 cm)' },
    39: { emoji: '🍉', label_fr: 'Pastèque (50,7 cm)' },
    40: { emoji: '🍉', label_fr: 'Pastèque (51,2 cm)' },
};

// Print summary of changes needed
console.log('📋 Week Emoji Corrections Needed:\n');
console.log('Week | Current → Correct | Label');
console.log('-----|-------------------|------');

const CURRENT_EMOJIS: { [week: number]: string } = {
    1: '🌱', 2: '🌱', 3: '🌱', 4: '🌱', 5: '🫘', 6: '🫘', 7: '🫘', 8: '🫘',
    9: '🍋', 10: '🍋', 11: '🍋', 12: '🍋', 13: '🥑', 14: '🥑', 15: '🥑', 16: '🥑',
    17: '🍐', 18: '🍐', 19: '🍐', 20: '🍐', 21: '🥭', 22: '🥭', 23: '🥭', 24: '🥭',
    25: '🥥', 26: '🥥', 27: '🥥', 28: '🥥', 29: '🍉', 30: '🍉', 31: '🍉', 32: '🍉',
    33: '🎃', 34: '🎃', 35: '🎃', 36: '🎃', 37: '👶', 38: '👶', 39: '👶', 40: '👶',
};

for (const [weekStr, data] of Object.entries(CORRECT_WEEK_DATA)) {
    const week = parseInt(weekStr, 10);
    const current = CURRENT_EMOJIS[week] || '?';
    if (current !== data.emoji) {
        console.log(`  ${week.toString().padStart(2)} | ${current} → ${data.emoji}        | ${data.label_fr}`);
    }
}

console.log('\n✅ Update these emojis in Firebase Console > Firestore > weeks collection');
