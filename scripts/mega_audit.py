#!/usr/bin/env python3
"""
MEGA AUDIT - Audit complet de tout le codebase non encore audité
Analyse: Auth, Navigation, Services, Screens, Hooks, Utils, Types, Security
"""
import re, os, json
from pathlib import Path

SRC = Path('/Users/1millnonstop/Downloads/pregnancy-app/app/src')

def read(path):
    try:
        return Path(path).read_text(encoding='utf-8', errors='replace')
    except:
        return ""

def scan(path):
    return read(SRC / path)

findings = {
    'CRITICAL': [],
    'HIGH': [],
    'MEDIUM': [],
    'LOW': [],
    'INFO': [],
}

def add(level, category, msg):
    findings[level].append(f"[{category}] {msg}")

# =====================================================
# 1. AUTHENTICATION & SECURITY
# =====================================================
print("Scanning Auth...")

auth_ctx = scan('context/AuthContext.tsx')
login = scan('screens/LoginScreen.tsx')
register = scan('screens/RegisterScreen.tsx')
firebase_cfg = scan('config/firebase.ts')
firebase_errors = scan('utils/firebaseErrors.ts')

# Auth context checks
if 'AsyncStorage' in auth_ctx and 'user' in auth_ctx:
    has_persist = 'setItem' in auth_ctx and 'getItem' in auth_ctx
    add('INFO', 'Auth', f"User persistence via AsyncStorage: {'✅' if has_persist else '❌'}")

if 'isGuest' in auth_ctx:
    add('INFO', 'Auth', "Guest mode implemented ✅")

# Security
if 'console.log' in auth_ctx:
    logs = re.findall(r'console\.log\([^)]*password[^)]*\)', auth_ctx, re.I)
    if logs:
        add('CRITICAL', 'Security', f"Password logged to console: {logs}")

# Firebase API key exposure
if 'apiKey' in firebase_cfg:
    if 'process.env' not in firebase_cfg and 'EXPO_PUBLIC' not in firebase_cfg:
        add('HIGH', 'Security', "Firebase API key hardcoded in config (not via env vars)")
    else:
        add('INFO', 'Security', "Firebase API key via env vars ✅")

# Error handling in auth screens
for scrname, scr in [('Login', login), ('Register', register)]:
    has_catch = 'catch' in scr
    has_error_state = 'setError' in scr or 'error' in scr.lower()
    has_loading = 'setLoading' in scr or 'loading' in scr.lower()
    if not has_catch:
        add('HIGH', 'Auth', f"{scrname}: no try/catch around async calls")
    if not has_error_state:
        add('MEDIUM', 'Auth', f"{scrname}: no error state for user feedback")
    if not has_loading:
        add('MEDIUM', 'Auth', f"{scrname}: no loading state")

# Password validation
has_pw_validation = 'password' in register.lower() and ('length' in register or 'minLength' in register)
if not has_pw_validation:
    add('MEDIUM', 'Auth', "Register: no password length/complexity validation visible")

# =====================================================
# 2. NAVIGATION
# =====================================================
print("Scanning Navigation...")

nav_types = scan('types/navigation.ts')
all_screens_ts = [f.name.replace('.tsx','').replace('Screen','') for f in (SRC/'screens').glob('*.tsx')]

# Check navigation type completeness
nav_params = re.findall(r'(\w+):\s*\{', nav_types)
nav_undefined = re.findall(r'(\w+):\s*undefined', nav_types)
all_nav_screens = nav_params + nav_undefined
nav_coverage = len(all_nav_screens)
add('INFO', 'Navigation', f"{nav_coverage} screens typed in navigation.ts")

# Look for navigate() without type safety
all_tsx = list((SRC/'screens').glob('*.tsx')) + list((SRC/'screens').glob('**/*.tsx'))
untyped_nav = []
for f in all_tsx:
    content = read(f)
    # Looks for navigate('ScreenName') with string literal
    raw_navs = re.findall(r"navigation\.navigate\(['\"]([^'\"]+)['\"]", content)
    for nav in raw_navs:
        if nav not in str(nav_types):
            untyped_nav.append(f"{f.name}: navigate('{nav}')")

if untyped_nav[:5]:
    add('LOW', 'Navigation', f"Potentially untyped navigate() calls: {untyped_nav[:5]}")

# Dead screens (file exists but not navigated to)
all_nav_refs = set()
for f in all_tsx:
    content = read(f)
    refs = re.findall(r"navigate\(['\"]([^'\"]+)['\"]", content)
    all_nav_refs.update(refs)

# =====================================================
# 3. SERVICES AUDIT
# =====================================================
print("Scanning Services...")

services_dir = SRC / 'services'
service_files = list(services_dir.glob('*.ts')) + list(services_dir.glob('*.tsx'))

for svc_file in sorted(service_files):
    content = read(svc_file)
    name = svc_file.stem
    
    # Check for unhandled promises
    unhandled = re.findall(r'(?<!\bawait\b)\s+\w+Service\.\w+\(', content)
    
    # Check for missing try/catch
    async_fns = re.findall(r'async\s+\w+\s*\(', content)
    try_blocks = content.count('try {') + content.count('try{')
    if len(async_fns) > try_blocks + 2:
        add('MEDIUM', f'Service:{name}', f"{len(async_fns)} async fns but only {try_blocks} try blocks")
    
    # Memory leaks - setInterval/setTimeout without cleanup
    has_interval = bool(re.search(r'setInterval|setTimeout', content))
    has_clear = bool(re.search(r'clearInterval|clearTimeout', content))
    if has_interval and not has_clear:
        add('HIGH', f'Service:{name}', "setInterval/setTimeout without clearInterval/clearTimeout (memory leak)")
    
    # console.log in production code
    console_logs = re.findall(r'console\.log\(', content)
    if len(console_logs) > 3:
        add('LOW', f'Service:{name}', f"{len(console_logs)} console.log statements (use logger instead)")
    
    # Firebase calls without error handling
    firebase_calls = re.findall(r'(getDocs|getDoc|addDoc|setDoc|updateDoc|deleteDoc)\(', content)
    if firebase_calls and try_blocks == 0:
        add('HIGH', f'Service:{name}', f"Firebase calls ({firebase_calls[:2]}) with NO try/catch")

# =====================================================
# 4. SCREENS AUDIT  
# =====================================================
print("Scanning Screens...")

screens_to_audit = [
    'HomeScreen', 'ProfileScreen', 'SettingsScreen',
    'RemindersScreen', 'WeightTrackerScreen', 'OnboardingScreen',
    'ArticlesListScreen', 'SupplementsListScreen', 'SupplementDetailScreen',
    'ForbiddenFoodsScreen', 'AddAppointmentScreen', 'WeekRecommendationsScreen',
    'CompletedTasksScreen', 'DiagnosticScreen', 'AuthChoiceScreen',
    'LanguageSelectScreen', 'PrivacyPolicyScreen', 'ResourcesScreen',
]

for screen_name in screens_to_audit:
    path = SRC / 'screens' / f'{screen_name}.tsx'
    if not path.exists():
        add('LOW', f'Screen:{screen_name}', "File not found")
        continue
    content = read(path)
    
    # Missing loading state
    has_loading = 'loading' in content.lower() and ('ActivityIndicator' in content or 'Loading' in content)
    has_error = 'error' in content.lower() and ('setError' in content or 'Error' in content)
    has_empty = 'empty' in content.lower() or 'noData' in content or 'length === 0' in content
    async_calls = re.findall(r'async.*?\(', content)
    has_try_catch = 'catch' in content
    
    if async_calls and not has_try_catch:
        add('HIGH', f'Screen:{screen_name}', "Async calls WITHOUT try/catch")
    
    if not has_loading and ('useEffect' in content or 'async' in content.lower()):
        add('MEDIUM', f'Screen:{screen_name}', "No loading state detected")
    
    if not has_error and has_try_catch:
        add('MEDIUM', f'Screen:{screen_name}', "try/catch present but no error state shown to user")
    
    # Memory leaks - useEffect without cleanup
    useeffect_count = content.count('useEffect(')
    return_count = content.count('return () =>')
    if useeffect_count > return_count + 1:
        add('LOW', f'Screen:{screen_name}', f"{useeffect_count} useEffects, {return_count} cleanups (potential leak)")
    
    # i18n missing
    has_t = "t('" in content or 't("' in content
    has_hardcoded_fr = bool(re.search(r'["\'][A-ZÀ-Ö][a-zà-ö]{4,}["\']', content)) 
    if not has_t and has_hardcoded_fr:
        add('MEDIUM', f'Screen:{screen_name}', "Hardcoded French strings, no t() translation function")

# =====================================================
# 5. HOOKS AUDIT
# =====================================================
print("Scanning Hooks...")

hooks = [
    'hooks/useAuthLoading.ts',
    'hooks/useCurrentWeek.ts', 
    'hooks/useDateLocale.ts',
    'hooks/useScreenAnalytics.ts',
]
for hook_path in hooks:
    content = scan(hook_path)
    if not content:
        add('LOW', f'Hook:{hook_path}', "Empty or missing")
        continue
    has_cleanup = 'return () =>' in content or 'clearTimeout' in content
    has_async = 'async' in content
    if has_async and not has_cleanup:
        add('MEDIUM', f'Hook:{Path(hook_path).stem}', "Async hook without cleanup")

# =====================================================
# 6. TYPES COMPLETENESS
# =====================================================
print("Scanning Types...")

types = scan('types/index.ts')

# ChatResponse type
if 'ChatResponse' in types:
    if 'anchor' not in types:
        add('LOW', 'Types', "ChatResponse missing 'anchor' field (used in chatbotService)")
    if "'error'" not in types and '"error"' not in types:
        add('LOW', 'Types', "ChatResponse type missing 'error' type variant")

# RedFlag type
if 'RedFlag' in types:
    if 'standard_message_tn' not in types:
        add('MEDIUM', 'Types', "RedFlag type missing standard_message_tn field")

# Article type
if 'Article' in types:
    if 'content_markdown_en' not in types:
        add('LOW', 'Types', "Article type missing content_markdown_en field")

# =====================================================
# 7. UTILITIES AUDIT
# =====================================================
print("Scanning Utils...")

rat_limiter = scan('utils/rateLimiter.ts')
retry = scan('utils/retry.ts')
validation = scan('utils/validation.ts')
i18n_helpers = scan('utils/i18nHelpers.ts')
firebase_errors_util = scan('utils/firebaseErrors.ts')
notification_msgs = scan('utils/notificationMessages.ts')

# Rate limiter
if 'chatbotLimiter' in rat_limiter:
    limit_config = re.search(r'chatbotLimiter.*?(\d+).*?(\d+)', rat_limiter)
    add('INFO', 'RateLimiter', f"chatbotLimiter found: {limit_config.group(0)[:60] if limit_config else 'config not parsed'}")
else:
    add('HIGH', 'RateLimiter', "chatbotLimiter not exported from rateLimiter.ts")

# Validation
email_validation = 'email' in validation.lower() and ('regex' in validation or 'match' in validation)
if not email_validation:
    add('MEDIUM', 'Utils:validation', "No email regex validation found")

# Notification messages i18n
has_ar_notifs = 'ar' in notification_msgs.lower() or 'arabic' in notification_msgs.lower()
has_tn_notifs = 'tn' in notification_msgs.lower() or 'tunisian' in notification_msgs.lower()
notif_keys = re.findall(r'["\']([^"\']{10,60})["\']', notification_msgs)
fr_only = [k for k in notif_keys if re.search(r'[a-zA-Zà-ÿ]{3,}', k) and not re.search(r'[أ-ي]', k)]
add('INFO', 'Notifications', f"notificationMessages: {len(fr_only)} FR strings, AR support: {'✅' if has_ar_notifs else '❌'}, TN: {'✅' if has_tn_notifs else '❌'}")

# =====================================================
# 8. NOTIFICATIONS SERVICE
# =====================================================
print("Scanning Notifications...")

notif_svc = scan('services/notificationService.ts')
reminder_svc = scan('services/reminderService.ts')
reminders_v2 = scan('services/remindersV2Service.ts')
scheduler = scan('services/remindersScheduler.ts')

# Check notification permission handling
has_permission_check = 'requestPermissions' in notif_svc or 'getPermissionsAsync' in notif_svc
has_permission_fallback = 'denied' in notif_svc.lower() or 'granted' in notif_svc.lower()
add('INFO', 'Notifications', f"Permission check: {'✅' if has_permission_check else '❌'} | Denial handling: {'✅' if has_permission_fallback else '❌'}")

# Check for missing cleanup
if 'addNotificationReceivedListener' in notif_svc and 'remove()' not in notif_svc:
    add('HIGH', 'Notifications', "Expo notification listeners not removed (memory leak)")

# Reminder scheduler
has_timezone = 'timezone' in scheduler.lower() or 'Timezone' in scheduler
add('INFO', 'Reminders', f"Timezone handling in scheduler: {'✅' if has_timezone else '❌'}")

# =====================================================
# 9. HEALTH SERVICE
# =====================================================
print("Scanning Health Service...")

health_svc = scan('services/healthService.ts')

# Fields present
has_glucose = 'glucose' in health_svc.lower()
has_symptoms = 'symptom' in health_svc.lower()
has_bp = 'bloodPressure' in health_svc or 'blood_pressure' in health_svc
has_weight = 'weight' in health_svc.lower()

add('INFO', 'Health', f"glucose: {'✅' if has_glucose else '❌'} | symptoms: {'✅' if has_symptoms else '❌'} | BP: {'✅' if has_bp else '❌'} | weight: {'✅' if has_weight else '❌'}")

if not has_glucose:
    add('HIGH', 'Health', "getGlucose/saveGlucose missing from healthService — HealthDashboard section vide")
if not has_symptoms:
    add('HIGH', 'Health', "symptoms not in healthService — chips UI non persistés en Firestore")

# =====================================================
# 10. WEIGHT SERVICE
# =====================================================
print("Scanning Weight...")

weight_svc = scan('services/weightService.ts')
weight_screen = scan('screens/WeightTrackerScreen.tsx')

has_bmi = 'bmi' in weight_svc.lower() or 'BMI' in weight_svc
has_chart = 'chart' in weight_screen.lower() or 'Chart' in weight_screen or 'LineChart' in weight_screen
has_ideal_weight = 'ideal' in weight_svc.lower() or 'recommand' in weight_svc.lower()

add('INFO', 'Weight', f"BMI calc: {'✅' if has_bmi else '❌'} | Chart: {'✅' if has_chart else '❌'} | Ideal range: {'✅' if has_ideal_weight else '❌'}")
if not has_chart:
    add('MEDIUM', 'Weight', "WeightTracker: No chart component — only list of entries (poor UX)")

# =====================================================
# 11. DATA EXPORT / PDF
# =====================================================
print("Scanning Export...")

pdf_svc = scan('services/pdfExportService.ts')
export_svc = scan('services/dataExportService.ts')

has_pdf = bool(pdf_svc)
has_export = bool(export_svc)
has_ar_pdf = 'ar' in pdf_svc.lower() and ('rtl' in pdf_svc.lower() or 'arabic' in pdf_svc.lower())

add('INFO', 'Export', f"PDF service: {'✅' if has_pdf else '❌'} | Data export: {'✅' if has_export else '❌'} | Arabic RTL PDF: {'✅' if has_ar_pdf else '❌'}")
if has_pdf and not has_ar_pdf:
    add('MEDIUM', 'Export', "PDF export not RTL-adapted for AR/TN users")

# =====================================================
# 12. TIPS & CONTENT SERVICE
# =====================================================
print("Scanning Content...")

tips_svc = scan('services/tipsService.ts')
content_svc = scan('services/contentService.ts')
baby_msg_svc = scan('services/babyMessageService.ts')

# Tips localization
tips_ar = 'ar' in tips_svc and ('title_ar' in tips_svc or 'content_ar' in tips_svc)
tips_tn = 'tn' in tips_svc and ('title_tn' in tips_svc or 'content_tn' in tips_svc)
add('INFO', 'Tips', f"AR localization: {'✅' if tips_ar else '❌'} | TN localization: {'✅' if tips_tn else '❌'}")

# Baby message
baby_ar = 'ar' in baby_msg_svc and ('message_ar' in baby_msg_svc or 'text_ar' in baby_msg_svc)
baby_tn = 'tn' in baby_msg_svc
add('INFO', 'BabyMessage', f"AR: {'✅' if baby_ar else '❌'} | TN: {'✅' if baby_tn else '❌'}")

# Content weeks coverage
week_refs = re.findall(r'week\s*[=:]\s*(\d+)', content_svc)
if week_refs:
    max_week = max(int(w) for w in week_refs)
    add('INFO', 'Content', f"Max week in contentService: {max_week}")

# =====================================================
# 13. HOME SCREEN DEEP AUDIT
# =====================================================
print("Scanning Home...")

home = scan('screens/HomeScreen.tsx')

has_week_data = 'weekData' in home or 'currentWeek' in home
has_skeleton = 'Skeleton' in home or 'skeleton' in home
has_error_boundary = 'ErrorBoundary' in home or 'errorBoundary' in home
has_offline = 'offline' in home.lower() or 'netinfo' in home.lower()
has_pull_refresh = 'RefreshControl' in home or 'refreshing' in home

add('INFO', 'Home', f"Week data: {'✅' if has_week_data else '❌'} | Skeleton: {'✅' if has_skeleton else '❌'} | Offline: {'✅' if has_offline else '❌'} | Pull-to-refresh: {'✅' if has_pull_refresh else '❌'}")

if not has_pull_refresh:
    add('LOW', 'Home', "No pull-to-refresh (RefreshControl) on HomeScreen")
if not has_skeleton:
    add('MEDIUM', 'Home', "No skeleton loading on HomeScreen")
if not has_offline:
    add('MEDIUM', 'Home', "No offline detection on HomeScreen")

# =====================================================
# 14. PROFILE SCREEN 
# =====================================================
print("Scanning Profile...")

profile = scan('screens/ProfileScreen.tsx')

has_avatar = 'avatar' in profile.lower() or 'photo' in profile.lower() or 'image' in profile.lower()
has_form_validation = 'validation' in profile.lower() or 'required' in profile.lower() or 'error' in profile.lower()
has_save_confirm = 'save' in profile.lower() and ('success' in profile.lower() or 'toast' in profile.lower())
has_delete_account = 'deleteAccount' in profile or 'delete' in profile.lower()

add('INFO', 'Profile', f"Avatar: {'✅' if has_avatar else '❌'} | Validation: {'✅' if has_form_validation else '❌'} | Save confirm: {'✅' if has_save_confirm else '❌'} | Delete account: {'✅' if has_delete_account else '❌'}")

if not has_avatar:
    add('LOW', 'Profile', "No avatar/photo upload capability")
if not has_form_validation:
    add('MEDIUM', 'Profile', "No form validation on ProfileScreen")

# =====================================================
# 15. ANALYTICS / TRACKING
# =====================================================
print("Scanning Analytics...")

analytics = scan('services/analyticsService.ts')
screen_analytics = scan('hooks/useScreenAnalytics.ts')

has_firebase_analytics = 'logEvent' in analytics or 'firebaseAnalytics' in analytics
has_consent = 'consent' in analytics.lower() or 'gdpr' in analytics.lower()
has_anonymize = 'anonymize' in analytics.lower() or 'anonymised' in analytics.lower()

add('INFO', 'Analytics', f"Firebase Analytics: {'✅' if has_firebase_analytics else '❌'} | GDPR consent: {'✅' if has_consent else '❌'} | Anonymize: {'✅' if has_anonymize else '❌'}")

if not has_consent:
    add('HIGH', 'Analytics', "Analytics without GDPR consent gate — illegal in EU/TN law")

# =====================================================
# 16. OFFLINE & NETWORK
# =====================================================
print("Scanning Offline...")

offline_notice = scan('components/common/OfflineNotice.tsx')
has_net_check = 'NetInfo' in offline_notice or 'useNetInfo' in offline_notice
add('INFO', 'Offline', f"OfflineNotice uses NetInfo: {'✅' if has_net_check else '❌'}")

# =====================================================
# 17. ERROR BOUNDARY
# =====================================================
print("Scanning Error Handling...")

error_boundary = scan('components/common/ErrorBoundary.tsx')
has_eb = bool(error_boundary)
has_eb_in_app = False

# Check if ErrorBoundary is used in app entry
app_files = list(Path('/Users/1millnonstop/Downloads/pregnancy-app/app').glob('App.tsx')) + \
            list(Path('/Users/1millnonstop/Downloads/pregnancy-app/app').glob('src/App.tsx'))
for app_file in app_files:
    app_content = read(app_file)
    if 'ErrorBoundary' in app_content:
        has_eb_in_app = True

add('INFO', 'ErrorHandling', f"ErrorBoundary component: {'✅' if has_eb else '❌'} | Used in App root: {'✅' if has_eb_in_app else '❌'}")
if has_eb and not has_eb_in_app:
    add('MEDIUM', 'ErrorHandling', "ErrorBoundary exists but may not wrap root App — uncaught errors will crash")

# =====================================================
# 18. SECURITY - DEEP SCAN
# =====================================================
print("Scanning Security...")

# Look for hardcoded secrets or tokens across all src files
all_src_files = list(SRC.rglob('*.ts')) + list(SRC.rglob('*.tsx'))
secrets_patterns = [
    (r'sk-[a-zA-Z0-9]{20,}', 'OpenAI key'),
    (r'AIza[0-9A-Za-z-_]{35}', 'Firebase API key inline'),
    (r'password\s*=\s*["\'][^"\']{4,}["\']', 'Hardcoded password'),
    (r'secret\s*=\s*["\'][^"\']{8,}["\']', 'Hardcoded secret'),
]
for f in all_src_files:
    content = read(f)
    for pattern, desc in secrets_patterns:
        matches = re.findall(pattern, content)
        if matches:
            add('CRITICAL', 'Security', f"{f.name}: {desc} found: {matches[0][:30]}...")

# =====================================================
# 19. MISSING i18n IN DASHBOARD ADDITIONS
# =====================================================
print("Scanning new HealthDashboard i18n...")

dashboard_keys_needed = [
    'dashboard.glucose', 'dashboard.glucoseNormal', 'dashboard.glucoseTarget',
    'dashboard.symptomsToday', 'dashboard.symptomNausea', 'dashboard.symptomFatigue',
    'dashboard.symptomBackPain', 'dashboard.symptomHeadache', 'dashboard.symptomSwelling',
    'dashboard.symptomInsomnia', 'dashboard.noSymptomsToday', 'dashboard.add',
]

for lang in ['fr', 'ar', 'tn', 'en']:
    try:
        dashboard_json = json.loads(Path(f'src/i18n/locales/{lang}/dashboard.json').read_text(encoding='utf-8'))
        missing = []
        for key_path in dashboard_keys_needed:
            key = key_path.split('.')[1]  # e.g. 'glucose'
            if key not in dashboard_json:
                missing.append(key)
        if missing:
            add('HIGH', f'i18n:{lang}', f"dashboard.json missing: {missing}")
        else:
            add('INFO', f'i18n:{lang}', "dashboard.json: all new glucose/symptom keys ✅")
    except Exception as e:
        add('HIGH', f'i18n:{lang}', f"Cannot read dashboard.json: {e}")

# =====================================================
# PRINT REPORT
# =====================================================
total = sum(len(v) for v in findings.values())
print(f"\n{'='*70}")
print(f"MEGA AUDIT REPORT — {total} findings")
print(f"{'='*70}\n")

for level in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']:
    items = findings[level]
    if items:
        emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🔵', 'INFO': '⚪'}[level]
        print(f"{emoji} {level} ({len(items)})")
        for item in items:
            print(f"   {item}")
        print()
