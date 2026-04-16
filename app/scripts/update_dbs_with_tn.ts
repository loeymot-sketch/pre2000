const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../');

const WEEKS_DB = path.join(ROOT_DIR, 'weeks_db.json');
const ARTICLES_DB = path.join(ROOT_DIR, 'articles_db.json');
const RED_FLAGS_DB = path.join(ROOT_DIR, 'red_flags_db.json');
const SUGGESTIONS_DB = path.join(ROOT_DIR, 'chatbot_suggestions.json');

// Helper to save JSON
function saveJson(filePath: any, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); // 2 spaces indentation
    console.log(`✅ Updated ${path.basename(filePath)}`);
}

// Translations helpers (basic dictionary for high-impact terms)
const TN_DICT = {
    // Sizes
    "Microscopique": "صغير برشا",
    "Graine de pavot": "حبة خشخاش",
    "Grain de sésame": "حبة جلجلان",
    "Lentille": "عدسة",
    "Myrtille": "توت",
    "Framboise": "فراواز",
    "Raisin": "عنب",
    "Olive": "زيتونة",
    "Figue": "كرموسة",
    "Datte": "تمرة",
    "Citron vert": "قارص",
    "Avocat": "avocat", // Common
    "Oignon": "بصلة",
    "Mangue": "مانجا",
    "Patate douce": "بطata حلوة",
    "Banane": "banane",
    "Carotte": "سفــنارية",
    "Courge": "قرع",
    "Aubergine": "baidhenjen", // phonetically or just Arabic
    "Maïs": "سبول",
    "Noix de coco": "joz el hind",
    "Ananas": "ananas",
    "Melon": "batikh",

    // Suggestions
    "J'ai des nausées matinales": "عندي دوخة وغثيان",
    "Je me sens très fatiguée": "تاعبة برشا",
    "J'ai des crampes dans les jambes": "عندي كرامب في ساقي",
    "Je n'arrive pas à dormir": "منجمش نرقد",
    "Quels aliments éviter ?": "شنوة ما ناكولش؟",
    "Je saigne un peu": "عندي شوية دم",
    "Je ne sens plus mon bébé bouger": "معاش نحس بالبيبي يتحرك",
    "J'ai de fortes douleurs au ventre": "عندي وجيعة قوية في كرشي",
    "J'ai de violents maux de tête": "راسي يوجع بلقوي",
    "Quand faire la première échographie ?": "وقتاش نعمل أول إكو؟",
    "Puis-je faire du sport ?": "نجم نعمل سبور؟",
    "Quels sont les signes du travail ?": "شنية علامات الولادة؟",
    "J'ai de la fièvre": "عندي السخانة",
    "J'ai des troubles de la vision": "عينية مزغللة",
    "Comment gérer le post-partum ?": "كيفاش نتصرف بعد الولادة؟",
    "J'ai des pensées négatives": "عندي أفكار خايبة",
    "Quels suppléments prendre ?": "شنوة المكملات اللي ناخذها؟",
    "J'ai des brûlures en urinant": "عندي حريق في البولة",
    "Je me sens gonflée": "حاسة روحي منفوخة",
    "Puis-je avoir des relations sexuelles ?": "نجم نرقد مع راجلي؟",
    "Je suis enceinte de jumeaux": "أنا حبلة بتوأم",
    "J'ai des contractions": "عندي وجيعة الطلق",
    "Comment préparer la valise de maternité ?": "شنوة نحط في فاليز الولادة؟",
    "J'ai mal au dos": "ظهري يوجع",
    "Je veux allaiter": "نحب نرضع",

    // Weeks Titles (fallback to Ar mainly, but update if common)
    "La conception": "التلقيح",
    "L'ovulation": "الإباضة",
};

async function updateWeeks() {
    if (!fs.existsSync(WEEKS_DB)) return;
    const weeks = JSON.parse(fs.readFileSync(WEEKS_DB, 'utf-8'));

    const updated = weeks.map((w: any) => {
        // Try to find TN translation for size, else fallback to AR
        let sizeTn = w.baby_size_label_ar;
        if (w.baby_size_label_fr && (TN_DICT as any)[w.baby_size_label_fr]) {
            sizeTn = (TN_DICT as any)[w.baby_size_label_fr];
        }

        return {
            ...w,
            title_tn: w.title_ar, // Base fallback
            baby_size_label_tn: sizeTn,
            baby_dev_text_tn: w.baby_dev_text_ar, // Long text fallback
            mom_body_text_tn: w.mom_body_text_ar, // Long text fallback
            warnings_text_tn: w.warnings_text_ar // Long text fallback
        };
    });
    saveJson(WEEKS_DB, updated);
}

async function updateArticles() {
    if (!fs.existsSync(ARTICLES_DB)) return;
    const articles = JSON.parse(fs.readFileSync(ARTICLES_DB, 'utf-8'));

    const updated = articles.map((a: any) => ({
        ...a,
        title_tn: a.title_ar,
        summary_tn: a.summary_ar,
        content_markdown_tn: a.content_markdown_ar
    }));
    saveJson(ARTICLES_DB, updated);
}

async function updateRedFlags() {
    if (!fs.existsSync(RED_FLAGS_DB)) return;
    const flags = JSON.parse(fs.readFileSync(RED_FLAGS_DB, 'utf-8'));

    const updated = flags.map((f: any) => {
        // Simple manual dictionary for labels if needed, or fallback
        return {
            ...f,
            label_tn: f.label_ar,
            keywords_tn: f.keywords_ar,
            standard_message_tn: f.standard_message_ar
        };
    });
    saveJson(RED_FLAGS_DB, updated);
}

async function updateSuggestions() {
    if (!fs.existsSync(SUGGESTIONS_DB)) return;
    const suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_DB, 'utf-8'));

    const updated = suggestions.map((s: any) => {
        let labelTn = s.label_ar;
        if (s.label_fr && (TN_DICT as any)[s.label_fr]) {
            labelTn = (TN_DICT as any)[s.label_fr];
        }

        return {
            ...s,
            title_tn: labelTn, // Mapping label to title/suggestion logic if needed, but here it's label
            label_tn: labelTn,
            desc_tn: s.desc_ar || "" // Some might be missing in source, handle gracefully
        };
    });
    saveJson(SUGGESTIONS_DB, updated);
}

async function main() {
    console.log("🇹🇳 Starting Tunisian Darija (TN) DB Update...");
    await updateWeeks();
    await updateArticles();
    await updateRedFlags();
    await updateSuggestions();
    console.log("✨ All DBs updated with 'tn' fields.");
}

main();
