const fs = require('fs');
const msgs = JSON.parse(fs.readFileSync('./app/DATA_PACK_MVP_V3_FINAL/baby_messages_db_v1_2_FULL.json'));
const missingMsgs = msgs.filter(m => !m.message_ar || !m.message_tn);
console.log('Missing baby messages translations:', missingMsgs.length);

const arts = JSON.parse(fs.readFileSync('./articles_db.json'));
const missingArts = arts.filter(a => !a.title_ar || !a.summary_ar || !a.content_markdown_ar || !a.title_tn || !a.summary_tn || !a.content_markdown_tn);
console.log('Missing articles translations:', missingArts.length);
