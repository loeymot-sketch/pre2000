const fs = require('fs');
const d = require('../../app/DATA_PACK_MVP_V3_FINAL/baby_messages_db_v1_2_FULL.json');
const unique = Array.from(new Set(d.map(m => m.message_fr)));
fs.writeFileSync('unique_fr.json', JSON.stringify(unique, null, 2));
console.log('Wrote unique_fr.json with', unique.length, 'items');
