import { useTranslation } from 'react-i18next';
import { fr, ar, arTN, enUS } from 'date-fns/locale';

/**
 * U-FIX-16: aligned with `getDateLocale` in `utils/i18nHelpers.ts`.
 * Previously this hook returned `arTN` for both `ar` and `tn` (Tunisian dialect),
 * while the helper returned `ar` (standard Arabic) for `ar` — leading to two
 * date formats co-existing in the same screen. Now both use the same mapping:
 *   - 'ar' → standard Arabic (`ar`)
 *   - 'tn' → Tunisian Arabic (`arTN`)
 */
export const useDateLocale = () => {
    const { i18n } = useTranslation();

    switch (i18n.language) {
        case 'ar':
            return ar;
        case 'tn':
            return arTN;
        case 'en':
            return enUS;
        case 'fr':
        default:
            return fr;
    }
};
