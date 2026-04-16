import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '../../');
const RED_FLAGS_JSON = path.join(ROOT_DIR, 'red_flags_db.json');

async function fixRedFlagsComplete() {
    console.log('🔧 Complete fix of red_flags_db.json...');

    const redFlags = JSON.parse(fs.readFileSync(RED_FLAGS_JSON, 'utf-8'));

    const fixedRedFlags = redFlags.map((rf: any, index: number) => {
        // The message is in different places depending on the entry:
        // - For entries 0-1: message is in keywords_fr (original CSV had it there)
        // - For entries 2+: message is in label_en OR severity (they used it inconsistently)

        // Check if standard_message_fr looks like an article ID (starts with 'a' and contains underscore)
        const isArticleId = rf.standard_message_fr &&
            (rf.standard_message_fr.startsWith('a') && rf.standard_message_fr.includes('_'));

        let message = rf.standard_message_fr;

        if (isArticleId || !message || message.trim() === '') {
            // Try to find the real message in other fields
            // It could be in label_en, severity, or keywords_fr (if it's a long sentence)

            // First check label_en - often contains the message
            if (rf.label_en && rf.label_en.length > 50) {
                message = rf.label_en;
            }
            // Then check severity - sometimes the message was put there
            else if (rf.severity && rf.severity.length > 50) {
                message = rf.severity;
            }
            // Fallback to a generic message
            else {
                message = "⚠️ Ce symptôme nécessite une attention médicale. Consultez un professionnel de santé.";
            }
        }

        // Real severity should be emergency, urgent_consult, or similar
        let severity = 'urgent_consult';
        if (rf.label_en === 'emergency' || rf.label_ar === 'emergency') {
            severity = 'emergency';
        } else if (rf.label_en === 'urgent_consult' || rf.label_ar === 'urgent_consult') {
            severity = 'urgent_consult';
        }

        // Build proper keywords from red_flag_id and label_fr
        const keywords = [
            rf.red_flag_id,
            ...(rf.label_fr ? rf.label_fr.split(' ') : [])
        ].filter(k => k && k.length > 2 && !k.includes('urgent') && !k.includes('emergency')).join(',');

        // Get linked articles - take from standard_message_fr if it's an ID, or from linked_articles_ids
        let linkedArticles: string[] = [];
        if (Array.isArray(rf.linked_articles_ids)) {
            linkedArticles = rf.linked_articles_ids;
        } else if (rf.standard_message_fr && rf.standard_message_fr.startsWith('a')) {
            linkedArticles = [rf.standard_message_fr];
        }

        console.log(`  ${index + 1}. ${rf.red_flag_id}: "${message.substring(0, 50)}..."`);

        return {
            red_flag_id: rf.red_flag_id,
            label_fr: rf.label_fr || '',
            label_ar: '',
            label_en: '',
            keywords_fr: keywords,
            keywords_ar: '',
            keywords_en: '',
            severity: severity,
            standard_message_fr: message,
            standard_message_ar: '',
            standard_message_en: '',
            linked_articles_ids: linkedArticles,
            sources: rf.sources || ''
        };
    });

    fs.writeFileSync(RED_FLAGS_JSON, JSON.stringify(fixedRedFlags, null, 4));
    console.log(`\n✅ Fixed ${fixedRedFlags.length} red flags`);

    // Verify all messages are proper (not article IDs)
    const stillBroken = fixedRedFlags.filter((rf: any) =>
        rf.standard_message_fr.startsWith('a') && rf.standard_message_fr.includes('_')
    );

    if (stillBroken.length > 0) {
        console.log(`\n⚠️ WARNING: ${stillBroken.length} entries still have article IDs as messages:`);
        stillBroken.forEach((rf: any) => console.log(`   - ${rf.red_flag_id}: ${rf.standard_message_fr}`));
    } else {
        console.log('\n✅ All entries have proper messages!');
    }
}

fixRedFlagsComplete().catch(console.error);
