import { useTranslation } from 'react-i18next';
import { fr, arTN, enUS } from 'date-fns/locale';

export const useDateLocale = () => {
    const { i18n } = useTranslation();

    switch (i18n.language) {
        case 'ar':
            return arTN;
        case 'en':
            return enUS;
        case 'tn':
            return arTN;
        case 'fr':
        default:
            return fr;
    }
};
