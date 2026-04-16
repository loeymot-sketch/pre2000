const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../');
const TEMPLATES_DB = path.join(ROOT_DIR, 'calendar_templates_db.json');

// Helper to save JSON
function saveJson(filePath: any, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Updated ${path.basename(filePath)}`);
}

// Dictionary for common template titles
const TN_DICT = {
    "Première consultation prénatale": "أول عيادة للحمل",
    "Échographie de datation": "إكو داتاسيون (تحديد التاريخ)",
    "Dépistage de la trisomie 21 (T21)": "تحليل تريزومي 21",
    "Échographie du premier trimestre (Morphologique)": "إكو الشهر الثالث (مورفو)",
    "Consultation du 4ème mois": "عيادة الشهر الرابع",
    "Échographie du deuxième trimestre (Morphologique)": "إكو الشهر الخامس (مورفو)",
    "Test de dépistage du diabète gestationnel (HGPO)": "تحليل السكر (HGPO)",
    "Consultation du 7ème mois": "عيادة الشهر السابع",
    "Échographie du troisième trimestre (Croissance)": "إكو الشهر السابع (النمو)",
    "Cours de préparation à l'accouchement": "دروس التحضير للولادة",
    "Bilan sanguin complet (Anémie, Sérologies)": "تحليل دم كامل",
    "Achat des premiers vêtements de bébé": "شراء حوايج البيبي",
    "Installation de la chambre de bébé": "تحضير بيت البيبي",
    "Faire sa valise de maternité": "تحضير فاليز الولادة",
    "Repos et relaxation": "رتح روحك",
    "Rendez-vous avec l'anesthésiste": "موعد طبيب البنج",
    "Vaccination contre la grippe (si saison)": "تلقيح القريب (كان وقتو)",
    "Vérification de l'apport en Vitamine D": "تحليل فيتامين D",
    "Bilan bucco-dentaire": "عيادة عند طبيب الأسنان",
    "Début du congé maternité": "بداية كونجي ماتيرنيتي",
    "Consultation post-natale": "عيادة بعد الولادة",
    "Rendez-vous chez le pédiatre (1er mois)": "طبيب الصغار (الشهر الأول)",
    "Séance de rééducation périnéale": "حصص الترويض (périnée)",
    "Achat du siège auto": "شراء كرسي كرهبة",
    "Vérification des droits et aides": "ثبت في حقوقك (CNAM/CNSS)"
};

async function updateTemplates() {
    if (!fs.existsSync(TEMPLATES_DB)) {
        console.error("❌ Templates DB not found");
        return;
    }

    const templates = JSON.parse(fs.readFileSync(TEMPLATES_DB, 'utf-8'));

    const updated = templates.map((t: any) => {
        let titleTn = t.title_ar;
        if (t.title_fr && (TN_DICT as any)[t.title_fr]) {
            titleTn = (TN_DICT as any)[t.title_fr];
        }

        return {
            ...t,
            title_tn: titleTn,
            description_tn: t.description_ar // Fallback to Arabic for description
        };
    });

    saveJson(TEMPLATES_DB, updated);
}

updateTemplates();
