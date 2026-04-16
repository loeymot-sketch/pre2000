import { createLogger } from '../utils/logger';
const log = createLogger('OnboardingScreen');
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Platform,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Dimensions,
    Animated,
    BackHandler,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { usePregnancy } from '../context/PregnancyContext';
import { theme } from '../theme';
import { Button } from '../components/common/Button';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { format, subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { analytics, auth } from '../config/firebase';
import { logEvent } from 'firebase/analytics';
import { getFirebaseErrorMessage } from '../utils/firebaseErrors';
import { useAuthLoading } from '../hooks/useAuthLoading';
import { retryOperation } from '../utils/retry';
import { calculatePregnancyWeek } from '../utils/pregnancyCalculator';
import { useDateLocale } from '../hooks/useDateLocale';
import { getPickerLocale } from '../utils/pickerLocale';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

const { width } = Dimensions.get('window');

// Dynamic step count based on status
const getStepCount = (status: PregnancyStatus): number => {
    switch (status) {
        case 'pregnant': return 4;
        case 'trying': return 3; // Status → Cycle → Account
        case 'curious': return 3; // Status → Explore → Welcome
        default: return 4;
    }
};

// Week data for emotional final screen (matches weeks_db.json - MAMAN APPROVED)
const WEEK_COMPARISONS: { [key: number]: { emoji: string; label: string } } = {
    1: { emoji: '🌱', label: 'microscopique' },
    2: { emoji: '🌱', label: 'microscopique' },
    3: { emoji: '🌱', label: 'microscopique' },
    4: { emoji: '🌱', label: 'graine_de_pavot' },
    5: { emoji: '🌱', label: 'graine_de_sesame' },
    6: { emoji: '🌱', label: 'lentille' },
    7: { emoji: '🫐', label: 'myrtille' },
    8: { emoji: '🍓', label: 'framboise' },
    9: { emoji: '🫒', label: 'olive' },
    10: { emoji: '🍒', label: 'cerise' },
    11: { emoji: '🍐', label: 'figue' },
    12: { emoji: '🍋', label: 'citron_vert' },
    13: { emoji: '🍑', label: 'peche' },
    14: { emoji: '🍋', label: 'citron' },
    15: { emoji: '🍎', label: 'pomme' },
    16: { emoji: '🥑', label: 'avocat' },
    17: { emoji: '🥑', label: 'avocat' },
    18: { emoji: '🥭', label: 'mangue' },
    19: { emoji: '🥭', label: 'mangue' },
    20: { emoji: '🍌', label: 'banane' },
    21: { emoji: '🥕', label: 'carotte' },
    22: { emoji: '🥭', label: 'papaye' },
    23: { emoji: '🍆', label: 'aubergine' },
    24: { emoji: '🌽', label: 'epi_de_mais' },
    25: { emoji: '🥦', label: 'brocoli' },
    26: { emoji: '🥬', label: 'chou' },
    27: { emoji: '🥬', label: 'chou_rave' },
    28: { emoji: '🍍', label: 'ananas' },
    29: { emoji: '🎃', label: 'courge' },
    30: { emoji: '🥬', label: 'chou_chinois' },
    31: { emoji: '🥥', label: 'noix_de_coco' },
    32: { emoji: '🥒', label: 'concombre' },
    33: { emoji: '🍍', label: 'ananas' },
    34: { emoji: '🍈', label: 'melon' },
    35: { emoji: '🍈', label: 'melon' },
    36: { emoji: '🥬', label: 'laitue_romaine' },
    37: { emoji: '🥬', label: 'bette_a_carde' },
    38: { emoji: '🍉', label: 'pasteque' },
    39: { emoji: '🍉', label: 'pasteque' },
    40: { emoji: '🍉', label: 'pasteque' },
};

type PregnancyStatus = 'pregnant' | 'trying' | 'curious' | null;
type DateMethod = 'ddr' | 'conception';

export const OnboardingScreen = () => {
    useScreenAnalytics('OnboardingScreen');
    const { user, loginAsGuest, register, login } = useAuth();
    const { setProfile } = usePregnancy();
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();

    // Get date locale using shared hook (handles all languages including tn → arTN)
    const dateLocale = useDateLocale();

    // Step state
    const [step, setStep] = useState(1);
    const fadeAnim = useState(new Animated.Value(1))[0];

    // Data collected
    const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus>(null);
    const [dateMethod, setDateMethod] = useState<DateMethod>('ddr');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [firstName, setFirstName] = useState('');
    const [isFirstPregnancy, setIsFirstPregnancy] = useState<boolean | null>(null);

    // TTC-specific state
    const [cycleLength, setCycleLength] = useState(28);
    const [lastPeriodDate, setLastPeriodDate] = useState(new Date());
    const [showCycleDatePicker, setShowCycleDatePicker] = useState(false);

    // Curious-specific state
    const [exploreWeek, setExploreWeek] = useState(20);

    // Personal info
    const [country, setCountry] = useState('tunisia');
    const [ageRange, setAgeRange] = useState<string>('');

    // Account creation (required at the end)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // UI
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { loading, withLoading } = useAuthLoading();
    const [error, setError] = useState('');

    useEffect(() => {
        log.debug('[Onboarding] 🚀 V2 Started');
        analytics.then(a => a && logEvent(a, 'onboarding_v2_start'));

        // Auto-detect country by IP (HTTPS for security + iOS ATS compliance)
        const detectCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_name) {
                    // Map to our country list
                    const countryMap: { [key: string]: string } = {
                        'Tunisia': 'tunisia',
                        'France': 'france',
                        'Belgium': 'belgium',
                        'Morocco': 'morocco',
                        'Algeria': 'algeria',
                    };
                    const detected = countryMap[data.country_name] || 'tunisia';
                    log.debug(`[Onboarding] 🌍 Detected country: ${data.country_name} → ${detected}`);
                    setCountry(detected);
                }
            } catch (err) {
                log.debug('[Onboarding] ⚠️ Could not detect country by IP, using default');
            }
        };
        detectCountry();
    }, []);

    // Calculate LMP from selected date based on method
    const getLmpDate = (): Date => {
        if (dateMethod === 'conception') {
            // Conception is ~14 days after DDR, so DDR = conception - 14 days
            const lmp = subDays(selectedDate, 14);
            log.debug(`[Onboarding] 📅 Conception → LMP: ${selectedDate.toISOString()} → ${lmp.toISOString()}`);
            return lmp;
        }
        log.debug(`[Onboarding] 📅 DDR direct: ${selectedDate.toISOString()}`);
        return selectedDate;
    };

    // Real-time pregnancy calculation
    const pregnancyInfo = useMemo(() => {
        const lmp = getLmpDate();
        const result = calculatePregnancyWeek(lmp);
        log.debug(`[Onboarding] 🧮 Calculated: Week ${result.week}, Day ${result.day} (method: ${dateMethod})`);
        return result;
    }, [selectedDate, dateMethod]);

    const weekComparison = WEEK_COMPARISONS[pregnancyInfo.week] || WEEK_COMPARISONS[1];

    // Animation for step transitions
    const animateTransition = (callback: () => void) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
        setTimeout(callback, 150);
    };

    const nextStep = () => {
        animateTransition(() => setStep(s => s + 1));
        analytics.then(a => a && logEvent(a, 'onboarding_step_complete', { step }));
    };

    const prevStep = () => {
        animateTransition(() => setStep(s => s - 1));
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) setSelectedDate(date);
    };

    const handleFinish = async (createAccount: boolean = false) => {
        setError('');
        const lmpDate = getLmpDate();

        log.debug('[Onboarding] 🎯 handleFinish called', { createAccount });
        log.debug(`[Onboarding] 📊 Profile data:`, {
            firstName: firstName || t('onboarding.step4.defaultName'),
            lmpDate: lmpDate.toISOString(),
            dateMethod,
            week: pregnancyInfo.week,
            day: pregnancyInfo.day,
            isFirstPregnancy,
            pregnancyStatus,
            country,
            ageRange,
        });

        await withLoading(async () => {
            try {
                let authenticatedUser = null;

                // Create account if requested
                if (createAccount && email && password) {
                    log.debug('[Onboarding] 📝 Creating account...');
                    try {
                        authenticatedUser = await retryOperation(
                            () => register(email.trim(), password),
                            { maxRetries: 1, initialDelay: 500 }
                        );
                    } catch (regError: any) {
                        // CRITICAL FIX: If registration fails because email exists (e.g. previous attempt failed at profile save),
                        // try to log in instead to recover the session and proceed to profile creation.
                        if (regError.code === 'auth/email-already-in-use') {
                            log.warn('[Onboarding] ⚠️ Email already in use, attempting login to recover...');
                            await login(email.trim(), password);
                            // If login succeeds, we continue. The auth state will update.
                            // We need access to the user object. logic inside login sets the state.
                            // But we need the user object returned here to pass to loginAsGuest.
                            // The login function in AuthContext doesn't return the user, it sets state.
                            // But we can get the current user from auth.currentUser immediately after await.
                            authenticatedUser = auth.currentUser;
                        } else {
                            throw regError;
                        }
                    }
                    log.debug('[Onboarding] ✅ Account created/recovered, uid:', authenticatedUser?.uid);
                }

                log.debug('[Onboarding] 👤 Creating profile...');
                log.debug('[Onboarding] 📅 LMP Date being saved:', lmpDate.toISOString());

                // Create profile (guest or authenticated)
                await retryOperation(() => loginAsGuest(
                    firstName || t('onboarding.step4.defaultName'),
                    lmpDate,
                    country,
                    undefined, // lastName
                    undefined, // city
                    ageRange || undefined,
                    isFirstPregnancy ?? undefined,
                    authenticatedUser ?? undefined
                ));

                log.debug('[Onboarding] ✅ Profile created successfully!');
                log.debug(`[Onboarding] 📅 LMP saved: ${lmpDate.toISOString()}`);
                log.debug(`[Onboarding] 📊 Week ${pregnancyInfo.week}, Day ${pregnancyInfo.day}`);

                analytics.then(a => a && logEvent(a, 'onboarding_v2_complete', {
                    method: dateMethod,
                    is_first_pregnancy: isFirstPregnancy,
                    week: pregnancyInfo.week,
                    country,
                    has_account: createAccount,
                }));

                log.debug('[Onboarding] ✅ Profile created, navigating to Home');
            } catch (err: any) {
                log.error('[Onboarding] ❌ Error during account/profile creation:', err);
                const errorMessage = getFirebaseErrorMessage(err);
                setError(t(errorMessage));
                // Don't re-throw - let withLoading complete and reset loading state
            }
        });
    };

    // ==========================================
    // RENDER STEPS
    // ==========================================

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(step / getStepCount(pregnancyStatus)) * 100}%` }]} />
        </View>
    );

    // STEP 1: Pregnancy Status
    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🌸</Text>
            <Text style={styles.stepTitle}>{t('onboarding.step1.title')}</Text>

            <View style={styles.optionsContainer}>
                <TouchableOpacity
                    style={[styles.optionCard, pregnancyStatus === 'pregnant' && styles.optionCardSelected]}
                    onPress={() => { setPregnancyStatus('pregnant'); nextStep(); }}
                >
                    <Text style={styles.optionEmoji}>🤰</Text>
                    <Text style={styles.optionText}>{t('onboarding.step1.pregnant')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.optionCard, pregnancyStatus === 'trying' && styles.optionCardSelected]}
                    onPress={() => { setPregnancyStatus('trying'); nextStep(); }}
                >
                    <Text style={styles.optionEmoji}>💕</Text>
                    <Text style={styles.optionText}>{t('onboarding.step1.trying')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.optionCard, pregnancyStatus === 'curious' && styles.optionCardSelected]}
                    onPress={() => { setPregnancyStatus('curious'); nextStep(); }}
                >
                    <Text style={styles.optionEmoji}>👀</Text>
                    <Text style={styles.optionText}>{t('onboarding.step1.curious')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // STEP 2: Date Selection (Smart)
    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>📅</Text>
            <Text style={styles.stepTitle}>{t('onboarding.step2.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.step2.subtitle')}</Text>

            {/* Method Selection */}
            <View style={styles.methodSelector}>
                <TouchableOpacity
                    style={[styles.methodButton, dateMethod === 'ddr' && styles.methodButtonActive]}
                    onPress={() => setDateMethod('ddr')}
                >
                    <Text style={[styles.methodText, dateMethod === 'ddr' && styles.methodTextActive]}>
                        {t('onboarding.step2.methodDdr')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.methodButton, dateMethod === 'conception' && styles.methodButtonActive]}
                    onPress={() => setDateMethod('conception')}
                >
                    <Text style={[styles.methodText, dateMethod === 'conception' && styles.methodTextActive]}>
                        {t('onboarding.step2.methodConception')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>
                    {dateMethod === 'ddr'
                        ? t('onboarding.step2.labelDdr')
                        : t('onboarding.step2.labelConception')}
                </Text>

                {Platform.OS === 'web' ? (
                    <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) setSelectedDate(newDate);
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        style={{
                            width: '100%',
                            padding: 16,
                            fontSize: 18,
                            borderRadius: 12,
                            border: '2px solid #FFB6C1',
                            backgroundColor: theme.colors.white,
                            textAlign: 'center',
                        }}
                    />
                ) : (
                    <>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                            <Text style={styles.dateText}>
                                {format(selectedDate, 'd MMMM yyyy', { locale: dateLocale })}
                            </Text>
                        </TouchableOpacity>
                        {/* Android Picker inline (since it launches a native dialogue anyway) */}
                        {Platform.OS === 'android' && showDatePicker && (
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                                locale={getPickerLocale(i18n.language)}
                            />
                        )}
                    </>
                )}

                {/* Live Preview */}
                <View style={styles.previewBox}>
                    {pregnancyInfo.isInvalid ? (
                        <Text style={[styles.previewLabel, { color: '#D32F2F', textAlign: 'center', fontWeight: 'bold' }]}>
                            {t('onboarding.step2.invalidDate', 'Date invalide : votre grossesse dépasse 40 semaines.')}
                        </Text>
                    ) : (
                        <>
                            <Text style={styles.previewLabel}>{t('onboarding.step2.previewLabel')}</Text>
                            <Text style={styles.previewWeek}>{t('onboarding.step2.week')} {pregnancyInfo.week}</Text>
                            <Text style={styles.previewSa}>
                                {t('onboarding.step2.saDays', { week: pregnancyInfo.week - 1, day: pregnancyInfo.day })}
                            </Text>
                        </>
                    )}
                </View>
            </View>

            <View style={styles.navButtons}>
                <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Button
                    title={t('common.continue')}
                    onPress={nextStep}
                    style={styles.continueButton}
                    disabled={pregnancyInfo.isInvalid}
                />
            </View>
        </View>
    );

    // STEP 3: Personalization
    const renderStep3 = () => (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.stepContentContainer}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.stepEmoji}>👋</Text>
            <Text style={styles.stepTitle}>{t('onboarding.step3.title')}</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('onboarding.step3.firstNameLabel')}</Text>
                <TextInput
                    style={styles.textInput}
                    placeholder={t('onboarding.step3.firstNamePlaceholder')}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    placeholderTextColor="#999"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('onboarding.step3.ageLabel')}</Text>
                <View style={styles.ageRangeContainer}>
                    {['18-24', '25-29', '30-34', '35-39', '40+'].map((range) => (
                        <TouchableOpacity
                            key={range}
                            style={[styles.ageRangeButton, ageRange === range && styles.ageRangeButtonSelected]}
                            onPress={() => setAgeRange(range)}
                        >
                            <Text style={[styles.ageRangeText, ageRange === range && styles.ageRangeTextSelected]}>
                                {range}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('onboarding.step3.countryLabel')}</Text>
                <View style={styles.radioGroup}>
                    {[
                        { value: 'tunisia', key: 'common.countries.tunisia' },
                        { value: 'france', key: 'common.countries.france' },
                        { value: 'belgium', key: 'common.countries.belgium' },
                        { value: 'morocco', key: 'common.countries.morocco' },
                        { value: 'algeria', key: 'common.countries.algeria' },
                        { value: 'other', key: 'common.countries.other' },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={[styles.radioOption, country === item.value && styles.radioOptionSelected]}
                            onPress={() => setCountry(item.value)}
                        >
                            <Text style={styles.radioText}>{t(item.key)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('onboarding.step3.firstPregnancyLabel')}</Text>
                <View style={styles.radioGroup}>
                    <TouchableOpacity
                        style={[styles.radioOption, isFirstPregnancy === true && styles.radioOptionSelected]}
                        onPress={() => setIsFirstPregnancy(true)}
                    >
                        <Text style={styles.radioText}>{t('onboarding.step3.firstPregnancyYes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.radioOption, isFirstPregnancy === false && styles.radioOptionSelected]}
                        onPress={() => setIsFirstPregnancy(false)}
                    >
                        <Text style={styles.radioText}>{t('onboarding.step3.firstPregnancyNo')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.radioOption, isFirstPregnancy === null && styles.radioOptionSelected]}
                        onPress={() => setIsFirstPregnancy(null)}
                    >
                        <Text style={styles.radioText}>{t('onboarding.step3.firstPregnancySkip')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.navButtons}>
                <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Button title={t('common.continue')} onPress={nextStep} style={styles.continueButton} />
            </View>
        </ScrollView>
    );

    // STEP 4: Final Screen with Account Option ✨
    const renderStep4 = () => {
        const canCreateAccount = email.trim().length > 0 && password.length >= 8 && /\d/.test(password);

        return (
            <LinearGradient
                colors={['#FFE8F0', '#FFF5F8', '#FFFFFF']}
                style={styles.finalContainer}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.finalScrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.finalContent}>
                        <Text style={styles.finalEmoji}>{weekComparison.emoji}</Text>

                        <Text style={styles.finalGreeting}>
                            {firstName ? `${firstName},` : t('onboarding.step4.defaultName') + ','}
                        </Text>

                        <Text style={styles.finalWeekLabel}>{t('onboarding.step4.youAreAt')}</Text>

                        <View style={styles.weekBadge}>
                            <Text style={styles.weekNumber}>{t('onboarding.step4.weekCaps')} {pregnancyInfo.week}</Text>
                            <Text style={styles.dayNumber}>{t('onboarding.step4.dayCaps')} {pregnancyInfo.day}</Text>
                        </View>

                        <Text style={styles.comparisonText}>
                            {t('onboarding.step4.babySize', { label: t(`onboarding.comparisons.${weekComparison.label}`), emoji: weekComparison.emoji })}
                        </Text>

                        <View style={styles.divider} />

                        {/* Account Creation Section - Only if not already authenticated */}
                        {!user && (
                            <View style={styles.accountSection}>
                                <Text style={styles.accountTitle}>{t('onboarding.step4.createAccountTitle')}</Text>
                                <Text style={styles.accountSubtitle}>
                                    {t('onboarding.step4.createAccountSubtitle')}
                                </Text>

                                <TextInput
                                    style={styles.accountInput}
                                    placeholder={t('onboarding.step4.emailPlaceholder')}
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TextInput
                                    style={styles.accountInput}
                                    placeholder={t('onboarding.step4.passwordPlaceholder')}
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        )}

                        {error ? <ErrorMessage message={error} /> : null}

                        {/* Create account button - REQUIRED */}
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => handleFinish(!!(!user && email && password))}
                            disabled={loading || (!user && !(email.trim().length > 0 && password.length >= 6))}
                        >
                            <LinearGradient
                                colors={loading || (!user && !(email.trim().length > 0 && password.length >= 6))
                                    ? ['#CCC', '#AAA']
                                    : ['#FF6B9D', '#C2185B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.startButtonGradient}
                            >
                                <Text style={styles.startButtonText}>
                                    {loading
                                        ? t('onboarding.step4.creatingAccount')
                                        : user
                                            ? t('onboarding.step4.finalizeProfile')
                                            : t('onboarding.step4.start')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipAccountButton}
                            onPress={() => handleFinish(false)}
                        >
                            <Text style={styles.skipAccountText}>{t('onboarding.step4.skipAccount')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={prevStep} style={styles.backButtonFinal}>
                            <Text style={styles.backButtonText}>{t('onboarding.step4.editInfos')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        );
    };

    // ==========================================
    // TTC (Trying to Conceive) FLOW STEPS
    // ==========================================

    // STEP 2 for TTC: Cycle Information
    const renderStep2TTC = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>💕</Text>
            <Text style={styles.stepTitle}>{t('onboarding.step2Ttc.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.step2Ttc.subtitle')}</Text>

            <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>{t('onboarding.step2Ttc.lastPeriodLabel')}</Text>

                {Platform.OS === 'web' ? (
                    <input
                        type="date"
                        value={lastPeriodDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) setLastPeriodDate(newDate);
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        style={{
                            width: '100%',
                            padding: 16,
                            fontSize: 18,
                            borderRadius: 12,
                            border: '2px solid #FFB6C1',
                            backgroundColor: theme.colors.white,
                            textAlign: 'center',
                        }}
                    />
                ) : (
                    <>
                        <TouchableOpacity onPress={() => setShowCycleDatePicker(true)} style={styles.dateInput}>
                            <Text style={styles.dateText}>
                                {format(lastPeriodDate, 'd MMMM yyyy', { locale: dateLocale })}
                            </Text>
                        </TouchableOpacity>
                        {/* Android Picker inline (launches native dialogue) */}
                        {Platform.OS === 'android' && showCycleDatePicker && (
                            <DateTimePicker
                                value={lastPeriodDate}
                                mode="date"
                                display="default"
                                onChange={(event, date) => {
                                    setShowCycleDatePicker(false);
                                    if (date) setLastPeriodDate(date);
                                }}
                                maximumDate={new Date()}
                                locale={getPickerLocale(i18n.language)}
                            />
                        )}
                    </>
                )}
            </View>

            <View style={[styles.inputGroup, { marginTop: 24 }]}>
                <Text style={styles.inputLabel}>{t('onboarding.step2Ttc.cycleLengthLabel')}</Text>
                <View style={styles.cycleLengthContainer}>
                    <TouchableOpacity
                        style={styles.cycleButton}
                        onPress={() => setCycleLength(Math.max(21, cycleLength - 1))}
                    >
                        <Text style={styles.cycleButtonText}>−</Text>
                    </TouchableOpacity>
                    <View style={styles.cycleLengthDisplay}>
                        <Text style={styles.cycleLengthNumber}>{cycleLength}</Text>
                        <Text style={styles.cycleLengthLabel}>{t('onboarding.step2Ttc.days')}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cycleButton}
                        onPress={() => setCycleLength(Math.min(35, cycleLength + 1))}
                    >
                        <Text style={styles.cycleButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.navButtons}>
                <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Button title={t('common.continue')} onPress={nextStep} style={styles.continueButton} />
            </View>
        </View>
    );

    // STEP 3 (Final) for TTC: Welcome Screen
    const renderStep3TTC = () => {
        const ovulationDay = cycleLength - 14;
        const ovulationDate = new Date(lastPeriodDate);
        ovulationDate.setDate(ovulationDate.getDate() + ovulationDay);

        return (
            <LinearGradient
                colors={['#FFE8F0', '#FFF5F8', '#FFFFFF']}
                style={styles.finalContainer}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.finalScrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.finalContent}>
                        <Text style={styles.finalEmoji}>💕</Text>

                        <Text style={styles.finalGreeting}>
                            {firstName ? `${firstName},` : t('onboarding.step4.defaultName') + ','}
                        </Text>

                        <Text style={styles.finalWeekLabel}>{t('onboarding.step3Ttc.welcome')}</Text>

                        <View style={styles.ttcInfoBox}>
                            <Text style={styles.ttcInfoTitle}>{t('onboarding.step3Ttc.fertileWindowLabel')}</Text>
                            <Text style={styles.ttcInfoDate}>
                                {t('onboarding.step3Ttc.around')} {format(ovulationDate, 'd MMMM', { locale: dateLocale })}
                            </Text>
                            <Text style={styles.ttcInfoNote}>
                                {t('onboarding.step3Ttc.cycleDayNote', { day: ovulationDay })}
                            </Text>
                        </View>

                        <Text style={styles.ttcMessage}>
                            {t('onboarding.step3Ttc.supportMessage')}
                        </Text>

                        <View style={styles.divider} />

                        <View style={styles.accountSection}>
                            <Text style={styles.accountTitle}>{t('onboarding.step3Ttc.createAccountTitle')}</Text>
                            <Text style={styles.accountSubtitle}>
                                {t('onboarding.step3Ttc.createAccountSubtitle')}
                            </Text>

                            <TextInput
                                style={styles.accountInput}
                                placeholder={t('onboarding.step4.emailPlaceholder')}
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TextInput
                                style={styles.accountInput}
                                placeholder={t('onboarding.step4.passwordPlaceholder')}
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        {error ? <ErrorMessage message={error} /> : null}

                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => handleFinish(true)}
                            disabled={loading || !(email.trim().length > 0 && password.length >= 6)}
                        >
                            <LinearGradient
                                colors={loading || !(email.trim().length > 0 && password.length >= 6)
                                    ? ['#CCC', '#AAA']
                                    : ['#FF6B9D', '#C2185B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.startButtonGradient}
                            >
                                <Text style={styles.startButtonText}>
                                    {loading ? t('onboarding.step4.creatingAccount') : t('onboarding.step3Ttc.start')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipAccountButton}
                            onPress={() => handleFinish(false)}
                        >
                            <Text style={styles.skipAccountText}>{t('onboarding.step4.skipAccount')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={prevStep} style={styles.backButtonFinal}>
                            <Text style={styles.backButtonText}>{t('onboarding.step4.editInfos')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        );
    };

    // ==========================================
    // CURIOUS FLOW STEPS
    // ==========================================

    // STEP 2 for Curious: Explore Week Selection
    const renderStep2Curious = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>👀</Text>
            <Text style={styles.stepTitle}>{t('onboarding.step2Curious.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.step2Curious.subtitle')}</Text>

            <View style={styles.exploreSection}>
                <Text style={styles.exploreSemaine}>{t('onboarding.step2.week')} {exploreWeek}</Text>
                <Text style={styles.exploreComparison}>
                    {t('onboarding.step2Curious.sizeComparison', {
                        emoji: WEEK_COMPARISONS[exploreWeek]?.emoji,
                        label: t(`onboarding.comparisons.${WEEK_COMPARISONS[exploreWeek]?.label}`)
                    })}
                </Text>

                <View style={styles.sliderContainer}>
                    <TouchableOpacity
                        style={styles.sliderButton}
                        onPress={() => setExploreWeek(Math.max(1, exploreWeek - 1))}
                    >
                        <Text style={styles.sliderButtonText}>−</Text>
                    </TouchableOpacity>

                    <View style={styles.sliderTrack}>
                        <View style={[styles.sliderFill, { width: `${(exploreWeek / 40) * 100}%` }]} />
                    </View>

                    <TouchableOpacity
                        style={styles.sliderButton}
                        onPress={() => setExploreWeek(Math.min(40, exploreWeek + 1))}
                    >
                        <Text style={styles.sliderButtonText}>+</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.trimesterLabels}>
                    <Text style={styles.trimesterLabel}>{t('onboarding.trimester1')}</Text>
                    <Text style={styles.trimesterLabel}>{t('onboarding.trimester2')}</Text>
                    <Text style={styles.trimesterLabel}>{t('onboarding.trimester3')}</Text>
                </View>
            </View>

            <View style={styles.navButtons}>
                <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Button title={t('onboarding.discover')} onPress={nextStep} style={styles.continueButton} />
            </View>
        </View>
    );

    // STEP 3 (Final) for Curious: Welcome Screen
    const renderStep3Curious = () => (
        <LinearGradient
            colors={['#FFE8F0', '#FFF5F8', '#FFFFFF']}
            style={styles.finalContainer}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.finalScrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.finalContent}>
                    <Text style={styles.finalEmoji}>👀</Text>

                    <Text style={styles.finalGreeting}>
                        {t('onboarding.discoverWelcome')}
                    </Text>

                    <Text style={styles.finalWeekLabel}>{t('onboarding.youExplore')}</Text>

                    <View style={styles.weekBadge}>
                        <Text style={styles.weekNumber}>{t('onboarding.step4.weekCaps')} {exploreWeek}</Text>
                    </View>

                    <Text style={styles.comparisonText}>
                        {t('onboarding.babySize', {
                            emoji: WEEK_COMPARISONS[exploreWeek]?.emoji,
                            label: t(`onboarding.comparisons.${WEEK_COMPARISONS[exploreWeek]?.label}`)
                        })}
                    </Text>

                    <View style={styles.curiousInfoBox}>
                        <Text style={styles.curiousInfoText}>
                            {t('onboarding.discoverInfo')}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {error ? <ErrorMessage message={error} /> : null}

                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => handleFinishCurious()}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={loading ? ['#CCC', '#AAA'] : ['#FF6B9D', '#C2185B']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <Text style={styles.startButtonText}>
                                {loading ? t('home.loadingData') : t('onboarding.discover')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={prevStep} style={styles.backButtonFinal}>
                        <Text style={styles.backButtonText}>{t('onboarding.changeWeek')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );

    // ==========================================
    // FINISH HANDLERS FOR DIFFERENT FLOWS
    // ==========================================

    const handleFinishTTC = async (createAccount: boolean = false) => {
        setError('');

        log.debug('[Onboarding] 🎯 handleFinishTTC called', { createAccount });

        await withLoading(async () => {
            try {
                let authenticatedUser = null;

                if (createAccount && email && password) {
                    try {
                        authenticatedUser = await retryOperation(
                            () => register(email.trim(), password),
                            { maxRetries: 1, initialDelay: 500 }
                        );
                    } catch (regError: any) {
                        if (regError.code === 'auth/email-already-in-use') {
                            log.warn('[Onboarding] ⚠️ TTC Email already in use, recovering...');
                            await login(email.trim(), password);
                            authenticatedUser = auth.currentUser;
                        } else {
                            throw regError;
                        }
                    }
                }

                // For TTC, we use lastPeriodDate as a reference but it's NOT a pregnancy LMP
                // We'll set a fake "week 0" to indicate pre-pregnancy
                const fakeLmp = new Date(); // Use today, week calculation will give week 1
                fakeLmp.setDate(fakeLmp.getDate() - 7); // Pretend LMP was 1 week ago for demo purposes

                await retryOperation(() => loginAsGuest(
                    firstName || t('onboarding.step4.defaultName'),
                    fakeLmp,
                    country,
                    undefined,
                    undefined,
                    ageRange || undefined,
                    undefined,
                    authenticatedUser ?? undefined
                ));

                analytics.then(a => a && logEvent(a, 'onboarding_ttc_complete', {
                    cycle_length: cycleLength,
                    country,
                    has_account: createAccount,
                }));

            } catch (err: any) {
                log.error('[Onboarding] ❌ Error during TTC profile creation:', err);
                setError(t(getFirebaseErrorMessage(err)));
            }
        });
    };

    const handleFinishCurious = async () => {
        setError('');

        log.debug('[Onboarding] 🎯 handleFinishCurious called');

        await withLoading(async () => {
            try {
                // For curious mode, we set a fake LMP to get the explore week
                const today = new Date();
                const fakeLmp = new Date(today);
                fakeLmp.setDate(today.getDate() - (exploreWeek - 1) * 7); // Set LMP to get desired explore week

                await retryOperation(() => loginAsGuest(
                    t('onboarding.curiousDefaultName'),
                    fakeLmp,
                    country,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined
                ));

                analytics.then(a => a && logEvent(a, 'onboarding_curious_complete', {
                    explore_week: exploreWeek,
                    country,
                }));

            } catch (err: any) {
                log.error('[Onboarding] ❌ Error during Curious profile creation:', err);
                setError(t(getFirebaseErrorMessage(err)));
            }
        });
    };
    // Determine which step to render based on status and step number
    const renderCurrentStep = () => {
        // Step 1 is always the same (status selection)
        if (step === 1) return renderStep1();

        // Step 2 and beyond depend on the status
        switch (pregnancyStatus) {
            case 'pregnant':
                if (step === 2) return renderStep2();
                if (step === 3) return renderStep3();
                if (step === 4) return renderStep4();
                break;
            case 'trying':
                if (step === 2) return renderStep2TTC();
                if (step === 3) return renderStep3TTC();
                break;
            case 'curious':
                if (step === 2) return renderStep2Curious();
                if (step === 3) return renderStep3Curious();
                break;
            default:
                return renderStep1();
        }
        return null;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {step < getStepCount(pregnancyStatus) && renderProgressBar()}

                <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
                    {renderCurrentStep()}
                </Animated.View>
            </ScrollView>

            {/* iOS Overlays for Date Pickers */}
            {Platform.OS === 'ios' && showDatePicker && (
                <View style={styles.iosPickerOverlay}>
                    <View style={styles.iosPickerContent}>
                        <View style={styles.iosPickerHeader}>
                            <Text style={styles.iosPickerTitle}>
                                {dateMethod === 'ddr'
                                    ? t('onboarding.step2.labelDdr')
                                    : t('onboarding.step2.labelConception')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Text style={styles.iosPickerDoneText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                            locale={getPickerLocale(i18n.language)}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            )}

            {Platform.OS === 'ios' && showCycleDatePicker && (
                <View style={styles.iosPickerOverlay}>
                    <View style={styles.iosPickerContent}>
                        <View style={styles.iosPickerHeader}>
                            <Text style={styles.iosPickerTitle}>{t('onboarding.step2Ttc.lastPeriodLabel')}</Text>
                            <TouchableOpacity onPress={() => setShowCycleDatePicker(false)}>
                                <Text style={styles.iosPickerDoneText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={lastPeriodDate}
                            mode="date"
                            display="spinner"
                            onChange={(event, date) => {
                                if (date) setLastPeriodDate(date);
                            }}
                            maximumDate={new Date()}
                            locale={getPickerLocale(i18n.language)}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
    },
    scrollContent: {
        flexGrow: 1,
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#FFE4EC',
        marginTop: Platform.OS === 'ios' ? 50 : 20,
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    stepContentContainer: {
        padding: 24,
        paddingTop: 40,
        paddingBottom: 40,
        alignItems: 'center' as const,
    },
    stepContent: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
    },
    stepEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 34,
    },
    stepSubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    optionsContainer: {
        width: '100%',
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#FFE4EC',
    },
    optionCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: '#FFF5F8',
    },
    optionEmoji: {
        fontSize: 32,
        marginEnd: 16,
    },
    optionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    methodSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    methodButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
    },
    methodButtonActive: {
        backgroundColor: '#FFE4EC',
    },
    methodText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    methodTextActive: {
        color: theme.colors.accent,
    },
    dateSection: {
        width: '100%',
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    dateInput: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFB6C1',
        backgroundColor: theme.colors.white,
        alignItems: 'center',
    },
    dateText: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
    },
    previewBox: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#FFF5F8',
        borderRadius: 12,
        alignItems: 'center',
    },
    previewLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    previewWeek: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.accent,
        marginTop: 4,
    },
    previewSa: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },
    inputGroup: {
        width: '100%',
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    textInput: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DDD',
        backgroundColor: '#FAFAFA',
        fontSize: 16,
    },
    radioGroup: {
        gap: 10,
    },
    radioOption: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#EEE',
        backgroundColor: '#FAFAFA',
    },
    radioOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: '#FFF5F8',
    },
    radioText: {
        fontSize: 16,
        color: '#333',
    },
    navButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 32,
        width: '100%',
    },
    backButton: {
        padding: 16,
    },
    backButtonText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    continueButton: {
        flex: 1,
    },
    // Final Screen Styles
    finalContainer: {
        flex: 1,
        minHeight: '100%',
    },
    finalContent: {
        width: '100%',
        padding: 32,
        paddingTop: 60,
        alignItems: 'center' as const,
    },
    finalEmoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    finalGreeting: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.accent,
        marginBottom: 16,
        textAlign: 'center' as const,
    },
    finalWeekLabel: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textAlign: 'center' as const,
    },
    weekBadge: {
        alignItems: 'center',
        marginBottom: 20,
    },
    weekNumber: {
        fontSize: 36,
        fontWeight: '800',
        color: '#333',
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textLight,
        marginTop: 4,
    },
    comparisonText: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 24,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: '#FFB6C1',
        marginVertical: 24,
    },
    emotionalText: {
        fontSize: 18,
        fontStyle: 'italic',
        color: theme.colors.textLight,
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 32,
    },
    startButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    startButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.white,
    },
    backButtonFinal: {
        marginTop: 20,
        padding: 12,
    },
    finalScrollContent: {
        flexGrow: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    accountSection: {
        width: '100%',
        marginBottom: 20,
    },
    accountTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: '#333',
        textAlign: 'center' as const,
        marginBottom: 6,
    },
    accountSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center' as const,
        marginBottom: 16,
    },
    accountToggle: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        padding: 12,
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFB6C1',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        marginEnd: 12,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    checkboxChecked: {
        backgroundColor: theme.colors.accent,
    },
    checkmark: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: 'bold' as const,
    },
    accountToggleText: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    accountFields: {
        marginTop: 12,
        gap: 10,
    },
    accountInput: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#FFB6C1',
        color: '#333',
        marginTop: 10,
        width: '100%',
    },
    accountNote: {
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'center' as const,
        marginTop: 8,
    },
    skipAccountButton: {
        marginTop: 12,
        padding: 14,
        alignItems: 'center' as const,
    },
    skipAccountText: {
        fontSize: 15,
        color: theme.colors.textLight,
        textDecorationLine: 'underline' as const,
    },
    ageRangeContainer: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: 10,
        justifyContent: 'center' as const,
    },
    ageRangeButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: theme.colors.white,
        borderWidth: 2,
        borderColor: '#FFB6C1',
        minWidth: 70,
        alignItems: 'center' as const,
    },
    ageRangeButtonSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    ageRangeText: {
        fontSize: 15,
        fontWeight: '600' as const,
        color: theme.colors.accent,
    },
    ageRangeTextSelected: {
        color: theme.colors.white,
    },
    startButtonDisabled: {
        opacity: 0.6,
    },
    // TTC Flow Styles
    cycleLengthContainer: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 20,
        marginTop: 12,
    },
    cycleButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFE4EC',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    cycleButtonText: {
        fontSize: 28,
        color: theme.colors.accent,
        fontWeight: '600' as const,
    },
    cycleLengthDisplay: {
        alignItems: 'center' as const,
        minWidth: 80,
    },
    cycleLengthNumber: {
        fontSize: 48,
        fontWeight: '700' as const,
        color: theme.colors.accent,
    },
    cycleLengthLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: -4,
    },
    ttcInfoBox: {
        backgroundColor: '#FFF5F8',
        borderRadius: 16,
        padding: 20,
        marginVertical: 16,
        borderWidth: 2,
        borderColor: '#FFE4EC',
        alignItems: 'center' as const,
    },
    ttcInfoTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#333',
        marginBottom: 8,
    },
    ttcInfoDate: {
        fontSize: 22,
        fontWeight: '700' as const,
        color: theme.colors.accent,
    },
    ttcInfoNote: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    ttcMessage: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center' as const,
        lineHeight: 24,
        marginTop: 8,
    },
    // Curious Flow Styles
    exploreSection: {
        alignItems: 'center' as const,
        marginVertical: 24,
    },
    exploreSemaine: {
        fontSize: 42,
        fontWeight: '700' as const,
        color: theme.colors.accent,
    },
    exploreComparison: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    sliderContainer: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        width: '100%',
        marginTop: 24,
        gap: 12,
    },
    sliderButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFE4EC',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    sliderButtonText: {
        fontSize: 24,
        color: theme.colors.accent,
        fontWeight: '600' as const,
    },
    sliderTrack: {
        flex: 1,
        height: 8,
        backgroundColor: '#FFE4EC',
        borderRadius: 4,
        overflow: 'hidden' as const,
    },
    sliderFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 4,
    },
    trimesterLabels: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        width: '100%',
        marginTop: 8,
        paddingHorizontal: 56,
    },
    trimesterLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500' as const,
    },
    curiousInfoBox: {
        backgroundColor: '#F0F4FF',
        borderRadius: 16,
        padding: 20,
        marginVertical: 16,
        borderWidth: 2,
        borderColor: '#E0E8FF',
    },
    curiousInfoText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 24,
    },
    iosPickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        overflow: 'hidden',
    },
    iosPickerContent: {
        backgroundColor: theme.colors.white,
        height: 300,
        paddingBottom: 20,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.disabled,
        backgroundColor: '#FAFAFA',
    },
    iosPickerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    iosPickerDoneText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.accent,
    },
});
