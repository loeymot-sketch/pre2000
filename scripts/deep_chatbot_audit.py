#!/usr/bin/env python3
"""
deep_chatbot_audit.py
Full audit: i18n keys, chatbot translations, content, redirections, pipeline in all languages
"""
import re, os, json

SRC = os.path.join(os.path.dirname(__file__), '..', 'app', 'src')

def read_file(path):
    full = os.path.join(SRC, path)
    return open(full, encoding='utf-8', errors='replace').read()

def get_i18n_keys(path):
    content = read_file(path)
    content = re.sub(r'//.*', '', content)
    keys = re.findall(r'^\s{2,}(\w+)\s*:', content, re.MULTILINE)
    return set(keys)

def check_translation_values(path):
    """Find keys with empty or placeholder values"""
    content = read_file(path)
    pairs = re.findall(r'(\w+)\s*:\s*[\'"`](.*?)[\'"`]', content)
    suspicious = []
    for key, val in pairs:
        if not val.strip():
            suspicious.append((key, 'EMPTY'))
        elif val == key:
            suspicious.append((key, 'SAME_AS_KEY'))
        elif re.match(r'^[A-Z_]+$', val):
            suspicious.append((key, f'PLACEHOLDER: {val}'))
    return suspicious

# =====================================================
# 1. i18n KEYS AUDIT
# =====================================================
print("=" * 70)
print("AUDIT CHATBOT — TRADUCTIONS, CONTENU, REDIRECTIONS")
print("=" * 70)

fr_keys = get_i18n_keys('i18n/locales/fr/index.ts')
ar_keys = get_i18n_keys('i18n/locales/ar/index.ts')
tn_keys = get_i18n_keys('i18n/locales/tn/index.ts')
en_keys = get_i18n_keys('i18n/locales/en/index.ts')

print(f"\n{'='*70}")
print(f"I. i18n KEYS COVERAGE")
print(f"{'='*70}")
print(f"  FR: {len(fr_keys)} keys (référence)")
print(f"  AR: {len(ar_keys)} keys | ⚠️  Manquantes: {sorted(fr_keys - ar_keys)}")
print(f"  TN: {len(tn_keys)} keys | ⚠️  Manquantes: {sorted(fr_keys - tn_keys)}")
print(f"  EN: {len(en_keys)} keys | ⚠️  Manquantes: {sorted(fr_keys - en_keys)}")

# Check for suspicious values per locale
for lang, path in [('AR', 'i18n/locales/ar/index.ts'), ('TN', 'i18n/locales/tn/index.ts'), ('EN', 'i18n/locales/en/index.ts')]:
    suspicious = check_translation_values(path)
    if suspicious:
        print(f"\n  {lang} suspicious values:")
        for k, v in suspicious[:10]:
            print(f"    ⚠️  {k}: {v}")

# Find t() calls in chatbot-related screens that may be missing
chatbot_keys_used = set()
for fname in ['screens/ChatbotScreen.tsx', 'services/chatbotService.ts']:
    content = read_file(fname)
    found = re.findall(r"t\('([^']+)'\)", content)
    chatbot_keys_used.update(found)

print(f"\n  Chatbot t() keys used: {len(chatbot_keys_used)}")
# Check which ones might be missing
chatbot_missing = []
for k in chatbot_keys_used:
    parts = k.split('.')
    leaf = parts[-1]
    if leaf not in fr_keys and leaf not in ar_keys:
        chatbot_missing.append(k)
if chatbot_missing:
    print(f"  ⚠️  Keys used in chatbot not found: {chatbot_missing}")
else:
    print(f"  ✅ All chatbot t() keys found in locales")

# =====================================================
# 2. CHATBOT DATA AUDIT
# =====================================================
print(f"\n{'='*70}")
print(f"II. CHATBOT DATA CONTENT AUDIT")
print(f"{'='*70}")

raw = read_file('data/chatbot_data.ts')

m1 = re.search(r'export const RED_FLAGS[^=]*=\s*(\[.*?\]);', raw, re.DOTALL)
flags = json.loads(m1.group(1)) if m1 else []
m2 = re.search(r'export const SUGGESTIONS[^=]*=\s*(\[.*?\]);', raw, re.DOTALL)
suggs = json.loads(m2.group(1)) if m2 else []
m3 = re.search(r'export const ARTICLES[^=]*=\s*(\[.*?\]);', raw, re.DOTALL)
articles = json.loads(m3.group(1)) if m3 else []

print(f"\n  RED FLAGS: {len(flags)} total")
for lang in ['fr', 'ar', 'tn']:
    lbl = sum(1 for f in flags if f.get(f'label_{lang}','').strip())
    msg = sum(1 for f in flags if f.get(f'message_{lang}','').strip())
    kw  = sum(1 for f in flags if f.get(f'keywords_{lang}','').strip())
    print(f"    {lang.upper()}: label={lbl}/{len(flags)} | message={msg}/{len(flags)} | keywords={kw}/{len(flags)}")

# TN == AR for flags?
tn_ar_same_flags = sum(1 for f in flags if f.get('label_tn','') == f.get('label_ar','') and f.get('label_tn',''))
print(f"    TN label = AR label (copie): {tn_ar_same_flags}/{len(flags)} (objectif: 0)")

# Messages TN authentiques?
tn_real_msg = sum(1 for f in flags if f.get('message_tn','') and f.get('message_tn','') != f.get('message_ar',''))
print(f"    TN message ≠ AR (dialectal): {tn_real_msg}/{len(flags)}")

print(f"\n  SUGGESTIONS: {len(suggs)} total")
for lang in ['fr', 'ar', 'tn']:
    lbl = sum(1 for s in suggs if s.get(f'label_{lang}','').strip())
    missing = [s.get('suggestion_id','?') for s in suggs if not s.get(f'label_{lang}','').strip()]
    print(f"    {lang.upper()}: label={lbl}/{len(suggs)}" + (f"  ⚠️  Missing: {missing}" if missing else "  ✅"))
has_topic = sum(1 for s in suggs if s.get('topic','').strip())
print(f"    topic field: {has_topic}/{len(suggs)}")

# TN suggestions quality
tn_ar_same_sugg = sum(1 for s in suggs if s.get('label_tn','') == s.get('label_ar','') and s.get('label_tn',''))
print(f"    TN label = AR label (copie): {tn_ar_same_sugg}/{len(suggs)}")

print(f"\n  ARTICLES: {len(articles)} total")
for lang in ['fr', 'ar', 'tn']:
    title = sum(1 for a in articles if a.get(f'title_{lang}','').strip())
    summary = sum(1 for a in articles if a.get(f'summary_{lang}','').strip())
    if lang == 'fr':
        content = sum(1 for a in articles if a.get('content_markdown','').strip())
    else:
        content = sum(1 for a in articles if a.get(f'content_markdown_{lang}','').strip())
    print(f"    {lang.upper()}: title={title}/{len(articles)} | summary={summary}/{len(articles)} | content={content}/{len(articles)}")

# TN-gloss coverage
tn_diff = sum(1 for a in articles if a.get('content_markdown_tn','') != a.get('content_markdown_ar',''))
print(f"    TN content ≠ AR (TN-gloss): {tn_diff}/{len(articles)}")

# Average content length per lang
for lang, key in [('FR', 'content_markdown'), ('AR', 'content_markdown_ar'), ('TN', 'content_markdown_tn')]:
    lengths = [len(a.get(key,'')) for a in articles if a.get(key,'').strip()]
    avg = int(sum(lengths)/max(len(lengths),1))
    print(f"    Avg content length {lang}: {avg} chars")

# =====================================================
# 3. REDIRECT / NAVIGATION AUDIT
# =====================================================
print(f"\n{'='*70}")
print(f"III. REDIRECTIONS CHATBOT → SCREENS")
print(f"{'='*70}")

chatbot_screen = read_file('screens/ChatbotScreen.tsx')
chatbot_svc = read_file('services/chatbotService.ts')

# Navigation calls
nav_to_article = re.findall(r"navigate.*?'ArticleDetail'.*?articleId.*?", chatbot_screen+chatbot_svc)
nav_to_supplement = re.findall(r"navigate.*?'SupplementDetail'", chatbot_screen+chatbot_svc)
nav_to_calendar = re.findall(r"navigate.*?'Calendrier'|navigate.*?'Calendar'", chatbot_screen+chatbot_svc)

print(f"  → ArticleDetail: {'✅ ' + str(len(nav_to_article)) + ' found' if nav_to_article else '❌ not found'}")
print(f"  → SupplementDetail: {'✅ found' if nav_to_supplement else '❌ not found'}")
print(f"  → Calendar: {'✅ found' if nav_to_calendar else '⚠️  not found'}")

# Article link in suggestions
sugg_with_article = sum(1 for s in suggs if s.get('article_id'))
sugg_with_supplement = sum(1 for s in suggs if s.get('supplement_id'))
print(f"\n  Suggestions WITH article_id: {sugg_with_article}/{len(suggs)}")
print(f"  Suggestions WITH supplement_id: {sugg_with_supplement}/{len(suggs)}")

# Red flags with action_url or navigate
flags_with_action = sum(1 for f in flags if f.get('action_url') or f.get('action'))
print(f"  Red Flags with action/redirect: {flags_with_action}/{len(flags)}")

# External links (emergency)
flags_emergency = [f for f in flags if 'urgence' in f.get('message_fr','').lower() or 'hôpital' in f.get('message_fr','').lower() or 'urgence' in f.get('label_fr','').lower()]
print(f"  Red Flags marked emergency: {len(flags_emergency)}")

# =====================================================
# 4. CHATBOT PIPELINE AUDIT PER LANGUAGE
# =====================================================
print(f"\n{'='*70}")
print(f"IV. PIPELINE AUDIT PAR LANGUE")
print(f"{'='*70}")

# Simulate which engine codes are active per language
keyword_engine = read_file('services/chatbot/engines/KeywordEngine.ts')
vector_engine = open(os.path.join(SRC, 'services/chatbot/engines/VectorEngine.ts'), encoding='utf-8', errors='replace').read() if os.path.exists(os.path.join(SRC, 'services/chatbot/engines/VectorEngine.ts')) else ''

# Check if RTL is applied
has_rtl_bubble = bool(re.search(r'isRTL.*bubble|bubbleAlign.*isRTL|alignSelf.*isRTL', chatbot_screen))
has_rtl_input = bool(re.search(r'textAlign.*isRTL|writingDirection.*rtl', chatbot_screen, re.I))
has_tn_detect = bool(re.search(r"language.*tn|lang.*tn|i18n.*tn", chatbot_screen, re.I))
has_ar_detect = bool(re.search(r"isArabicScript|arabicChars|\\\\u0600", chatbot_svc+keyword_engine))

print(f"\n  RTL bubbles: {'✅' if has_rtl_bubble else '❌'}")
print(f"  RTL input: {'✅' if has_rtl_input else '❌'}")
print(f"  TN lang detection: {'✅' if has_tn_detect else '⚠️'}")
print(f"  Arabic script detection: {'✅' if has_ar_detect else '❌'}")

# Synonym coverage
SYNONYMS_in_engine = re.findall(r"'(\w+)'\s*:", keyword_engine)
arabizi_concepts = len(set(SYNONYMS_in_engine))
print(f"  Arabizi SYNONYMS concepts: {arabizi_concepts}")

# Negation handling
has_negation_ar = bool(re.search(r'AR_NEG|TN_NEG|negation', keyword_engine, re.I))
has_negation_words = bool(re.search(r"'لا'|'مش'|'ma3andish'", keyword_engine))
print(f"  Négation AR handling: {'✅' if has_negation_ar else '❌'}")
print(f"  Négation mots-clés: {'✅' if has_negation_words else '❌'}")

# Concept-Topic bridge
has_bridge = bool(re.search(r'CONCEPT_TN_BRIDGE', chatbot_svc))
print(f"  Arabizi CONCEPT_TN_BRIDGE: {'✅' if has_bridge else '❌'}")

# Rate limiter
has_rate = bool(re.search(r'rateLimiter|RateLimiter', chatbot_svc))
print(f"  Rate limiter: {'✅' if has_rate else '❌'}")

# =====================================================
# 5. MISSING EMOJI / LABELS / URGENCY
# =====================================================
print(f"\n{'='*70}")
print(f"V. QUALITÉ CONTENU CHATBOT")
print(f"{'='*70}")

# Red flags with emergency level
flags_severity = {}
for f in flags:
    sev = f.get('severity', 'unknown')
    flags_severity[sev] = flags_severity.get(sev, 0) + 1
print(f"\n  Red Flags par sévérité: {flags_severity}")

# Suggestions with topics
topics = {}
for s in suggs:
    t = s.get('topic', 'unknown')
    topics[t] = topics.get(t, 0) + 1
print(f"  Suggestions par topic: {dict(list(topics.items())[:10])}")

# Articles by category
cats = {}
for a in articles:
    c = a.get('category', 'unknown')
    cats[c] = cats.get(c, 0) + 1
print(f"  Articles par catégorie: {dict(sorted(cats.items(), key=lambda x: -x[1])[:10])}")

# Empty content articles
empty_ar = [a.get('article_id','?') for a in articles if not a.get('content_markdown_ar','').strip()]
empty_fr = [a.get('article_id','?') for a in articles if not a.get('content_markdown','').strip()]
print(f"\n  Articles sans contenu FR: {len(empty_fr)}")
print(f"  Articles sans contenu AR: {len(empty_ar)}")
if empty_ar[:5]:
    print(f"  Premiers AR vides: {empty_ar[:5]}")

# Suggestions linked to real articles
valid_article_ids = {a.get('article_id') for a in articles}
broken_sugg = [s.get('suggestion_id') for s in suggs if s.get('article_id') and s.get('article_id') not in valid_article_ids]
print(f"\n  Suggestions avec article_id cassé: {len(broken_sugg)}" + (f" → {broken_sugg}" if broken_sugg else " ✅"))

print(f"\n{'='*70}")
print(f"AUDIT TERMINÉ")
print(f"{'='*70}")
