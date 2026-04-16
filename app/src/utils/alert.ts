import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert utility.
 * Uses Alert.alert on Native and window.alert on Web.
 */
export const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
        // On Web, window.alert only takes a message. We combine title and message.
        window.alert(`${title}\n\n${message}`);

        // If there are buttons with onPress, we can't easily simulate them with window.alert
        // For simple "OK" buttons, window.alert is fine.
        // For confirmation dialogs (Yes/No), we should use window.confirm, but that's synchronous.
        // For now, let's assume simple alerts.
        if (buttons && buttons.length > 0) {
            const confirmButton = buttons.find(b => b.style !== 'cancel');
            if (confirmButton && confirmButton.onPress) {
                // Execute the positive action immediately or after a confirm?
                // Let's just execute it if it's the only way, or maybe we shouldn't?
                // Actually, for "Email already in use" -> "Login", we need a confirm.

                // Basic confirm support
                if (buttons.length > 1) {
                    const result = window.confirm(`${title}\n\n${message}`);
                    if (result) {
                        confirmButton.onPress();
                    }
                } else {
                    // Just an OK button with a callback?
                    confirmButton.onPress();
                }
            }
        }
    } else {
        Alert.alert(title, message, buttons);
    }
};
