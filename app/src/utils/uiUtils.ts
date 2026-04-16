import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog
 * Uses window.confirm on Web and Alert.alert on Native
 */
export const confirmAction = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    cancelLabel?: string,
    confirmLabel?: string
) => {
    const i18n = require('../i18n').default;
    const finalCancel = cancelLabel || i18n.t('ui.cancel');
    const finalConfirm = confirmLabel || i18n.t('ui.confirm');
    if (Platform.OS === 'web') {
        const result = window.confirm(`${title}\n\n${message}`);
        if (result) {
            onConfirm();
        } else if (onCancel) {
            onCancel();
        }
    } else {
        Alert.alert(
            title,
            message,
            [
                { text: finalCancel, style: 'cancel', onPress: onCancel },
                { text: finalConfirm, style: 'destructive', onPress: onConfirm }
            ]
        );
    }
};
