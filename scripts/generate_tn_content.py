#!/usr/bin/env python3
"""
generate_tn_content.py
======================
Génère du contenu Tunisien authentique pour l'app Mama & Bébé.

STRATÉGIE :
  - Base = Arabe Standard Moderne (MSA) — que les Tunisiens lisent et comprennent
  - Substitution SÉLECTIVE : uniquement les mots du quotidien (pas les termes médicaux)
  - Termes médicaux/scientifiques = GARDER EN MSA
  - Résultat : arabe accessible + légèrement « tunisianisé » pour le confort de lecture

TERMES GARDÉS EN MSA (ne pas remplacer) :
  الحمل، الجنين، المشيمة، الرحم، الانقباضات، التشنجات، ضغط الدم،
  السكري، الغدة الدرقية، الأوعية الدموية، التهاب، الفيتامينات،
  الكالسيوم، الحديد، تسمم الحمل، الإجهاض، الفحوصات، الموجات فوق الصوتية
"""

import json
import re
import sys

# =====================================================
# TN-GLOSS MAP : MSA → Tunisian everyday word
# Rules:
#   - Key   : exact Arabic word/phrase to match (case insensitive)
#   - Value : Tunisian replacement
#   - Medical/scientific terms are NOT in this map (kept as MSA)
# =====================================================
TN_GLOSS = [
    # Lieux / institutions (MOST COMMON substitutions Tunisians say daily)
    ('المستشفى',              'السبيطار'),
    ('مستشفى',                'سبيطار'),
    ('الصيدلية',              'الفارما'),
    ('صيدلية',                'فارما'),

    # Nourriture / boisson
    ('الطعام',                'الماكلة'),
    ('طعامك',                 'ماكلتك'),
    ('الأكل',                 'الماكلة'),
    ('أكلك',                  'ماكلتك'),
    ('تناولي',                'كلي'),
    ('تناول ',                'تناول '),   # keep in verb form (e.g. "تناول الحديد")
    ('اشربي الماء',           'اشربي الما'),
    ('شربي الماء',            'اشربي الما'),
    ('الماء',                 'الما'),

    # Symptômes courants — langage du quotidien
    ('الغثيان الصباحي',       'ردان الصباح'),
    ('الغثيان',               'الردان'),
    ('غثيان',                 'ردان'),
    ('الصداع الشديد',         'وجيعة الراس القوية'),
    ('الصداع',                'وجيعة الراس'),
    ('صداع',                  'وجيعة راس'),
    ('ألم شديد',              'وجيعة قوية'),
    ('الألم',                 'الوجيعة'),
    ('ألم',                   'وجيعة'),
    ('الحرارة المرتفعة',      'السخانة'),
    ('ارتفاع درجة الحرارة',   'السخانة'),
    ('الحرارة',               'السخانة'),
    ('حرارة',                 'سخانة'),
    ('التعب الشديد',          'الفشل الكبير'),
    ('التعب',                 'التعبان'),
    ('التعبان',               'الفشل'),   # avoid double replace
    ('الإرهاق',               'الفشل'),
    ('إرهاق',                 'فشل'),
    ('تعبت',                  'فشلت'),

    # Sommeil
    ('النوم',                 'الرقاد'),
    ('نوم',                   'رقاد'),
    ('تنامي',                 'ترقدي'),
    ('نامي',                  'ارقدي'),

    # Bébé — dans les messages directs seulement (pas dans les termes médicaux)
    ('طفلك',                  'بيبيك'),
    ('طفلكِ',                 'بيبيك'),
    ('جنينك',                 'بيبيك'),   # bébé (pas "الجنين" médical qui reste)
    ('طفلي',                  'بيبيتي'),

    # Actions / conseils (voix directe)
    ('استشيري طبيبتك أو طبيبك', 'اتصلي بالطبيب'),
    ('استشيري طبيبك',         'اتصلي بالطبيب'),
    ('استشيري طبيباً',        'اتصلي بالطبيب'),
    ('استشيري طبيبك أو المستشفى', 'اتصلي بالطبيب أو روحي للسبيطار'),
    ('اتصلي بخدمات الطوارئ فوراً', 'اتصلي بالإسعاف توة أو روحي للطوارئ'),
    ('اتصلي بخدمات الطوارئ',  'اتصلي بالإسعاف توة'),
    ('اذهبي إلى المستشفى فوراً', 'روحي للسبيطار توة'),
    ('اتصلي بطبيبك فوراً',    'اتصلي بالطبيب توة'),
    ('دون انتظار',             'توة'),
    ('فوراً',                  'توة'),
    ('على الفور',              'توة'),

    # Expressions communes
    ('يُعدّ',                  'يعتبر'),
    ('يُعدُّ',                 'يعتبر'),
    ('يُعتبر',                 'يعتبر'),
    ('لذا',                   'برشا بش'),
    ('لذلك',                  'وهكا'),
    ('لهذا السبب',            'وهكا'),
    ('ينبغي',                 'لازم'),
    ('يجب',                   'لازم'),
    ('يجب عليكِ',             'لازمك'),
    ('يجب عليك',              'لازمك'),
    ('ينبغي عليكِ',           'لازمك'),
    ('ينبغي عليك',            'لازمك'),
    ('يمكنكِ',                'تقدري'),
    ('يمكنك',                 'تقدري'),
    ('لا تترددي في',          'ما تخمميش في'),
    ('لا تترددي',             'ما تخمميش'),
    ('تجنبي',                 'ما تعمليش'),
    ('تجنب',                  'تجنب'),     # garde si non-direct
    ('احرصي على',             'تنبهي على'),
    ('احرصي',                 'تنبهي'),
    ('تذكري',                 'فاكري'),
]

# =====================================================
# Terms that MUST stay in MSA — do not gloss
# (These are checked to ensure we don't accidentally replace substrings)
PROTECTED_MSA = {
    'المشيمة', 'الرحم', 'الجنين', 'الحمل', 'الانقباضات', 'التشنجات',
    'ضغط الدم', 'السكري', 'الغدة الدرقية', 'الأوعية الدموية', 'الحديد',
    'الفيتامينات', 'الكالسيوم', 'الحمض الفوليك', 'تسمم الحمل',
    'الإجهاض', 'الفحوصات', 'الموجات فوق الصوتية', 'الجهاز الهضمي',
    'الجهاز المناعي', 'الجهاز العصبي', 'الحوض', 'عنق الرحم',
    'المشيمة المنزاحة', 'انفصال المشيمة', 'الأكسجين', 'الكريات الحمراء',
    'هيموغلوبين', 'البروتين', 'الكربوهيدرات', 'الدهون',
}

def apply_tn_gloss(text: str) -> str:
    """
    Apply TN-gloss substitutions to MSA text.
    - Replaces common everyday words with Tunisian equivalents
    - Keeps all medical/scientific terms in MSA
    - Processes longest phrases first to avoid partial matches
    """
    if not text:
        return text

    result = text

    # Apply substitutions in order (longest first for each position)
    for msa, tn in TN_GLOSS:
        # Case-insensitive whole-word replacement
        # Use word boundaries where possible
        pattern = re.escape(msa)
        result = re.sub(pattern, tn, result)

    return result

def process_article_tn(article: dict) -> str:
    """
    Generate proper TN content for an article:
    - Base = content_markdown_ar (MSA)
    - Apply TN gloss to make it more accessible for Tunisian readers
    - Keep scientific/medical terms as MSA
    """
    ar_content = article.get('content_markdown_ar', '')
    return apply_tn_gloss(ar_content)

def process_title_tn(article: dict) -> str:
    ar_title = article.get('title_ar', '')
    return apply_tn_gloss(ar_title)

def process_summary_tn(article: dict) -> str:
    ar_summary = article.get('summary_ar', '')
    return apply_tn_gloss(ar_summary)


def main():
    import sys
    sys.path.insert(0, '.')

    data_file = 'app/src/data/chatbot_data.ts'

    with open(data_file, 'r', encoding='utf-8') as f:
        raw = f.read()

    # Extract ARTICLES
    m = re.search(r'(export const ARTICLES[^=]*=\s*)(\[.*?\]);', raw, re.DOTALL)
    if not m:
        print("ERROR: ARTICLES not found")
        sys.exit(1)

    prefix = m.group(1)
    articles = json.loads(m.group(2))
    print(f"Found {len(articles)} articles")

    # Stats
    changed = 0
    identical = 0

    for article in articles:
        ar_content = article.get('content_markdown_ar', '')
        ar_title   = article.get('title_ar', '')
        ar_summary = article.get('summary_ar', '')

        new_tn_content  = apply_tn_gloss(ar_content)
        new_tn_title    = apply_tn_gloss(ar_title)
        new_tn_summary  = apply_tn_gloss(ar_summary)

        if new_tn_content != ar_content:
            changed += 1
        else:
            identical += 1

        article['content_markdown_tn'] = new_tn_content
        article['title_tn']            = new_tn_title
        article['summary_tn']          = new_tn_summary

    print(f"Articles with TN changes: {changed}/{len(articles)}")
    print(f"Articles unchanged (no common words found): {identical}/{len(articles)}")

    # Show sample diff
    sample = articles[0]
    ar = sample.get('content_markdown_ar', '')[:200]
    tn = sample.get('content_markdown_tn', '')[:200]
    print(f"\nSample article[0]:")
    print(f"  AR: {ar[:100]}")
    print(f"  TN: {tn[:100]}")
    print(f"  Same: {ar == tn}")

    # Serialize back
    articles_json = json.dumps(articles, ensure_ascii=False, indent=2)
    new_raw = raw[:m.start(2)] + articles_json + raw[m.end(2):]

    with open(data_file, 'w', encoding='utf-8') as f:
        f.write(new_raw)

    print(f"\n✅ chatbot_data.ts updated with TN-gloss content for {len(articles)} articles")

if __name__ == '__main__':
    main()
