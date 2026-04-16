import { Share, Alert, Platform } from 'react-native';
import { createLogger } from '../utils/logger';
import { getWeightHistory } from './weightService';
import { loadUserSettings } from './remindersV2Service';

const log = createLogger('DataExportService');

/**
 * Generate a complete JSON export of user data
 */
export const generateExportData = async (user: any, profile: any) => {
    try {
        const userId = user?.uid || 'guest';

        // Parallel data fetching
        const [weightHistory, remindersSettings] = await Promise.all([
            getWeightHistory(userId),
            loadUserSettings(userId)
        ]);

        // P0 GDPR FIX: Anonymize userId — raw Firebase UID must never appear in shared exports
        const anonymizedId = userId.startsWith('guest')
            ? 'guest'
            : `user_${userId.slice(0, 4)}***`;

        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                appVersion: '1.0.0',
                platform: Platform.OS,
                userId: anonymizedId // Anonymized — raw UID never exported
            },
            profile: {
                ...profile,
                // P0 GDPR FIX: Only include email if user is authenticated (not guest)
                email: user?.isGuest ? undefined : user?.email,
                isGuest: user?.isGuest
            },
            weightHistory,
            remindersSettings
        };

        return exportData;
    } catch (error) {
        log.error('Error generating export data', error);
        throw error;
    }
};

/**
 * Share the exported data as a JSON string
 */
export const exportUserData = async (user: any, profile: any, t: any) => {
    try {
        const data = await generateExportData(user, profile);
        const jsonString = JSON.stringify(data, null, 2);

        const result = await Share.share({
            message: jsonString,
            title: `mama-bebe-export-${new Date().toISOString().split('T')[0]}.json`
        });

        if (result.action === Share.sharedAction) {
            log.info('Data shared successfully');
        } else if (result.action === Share.dismissedAction) {
            log.info('Data share dismissed');
        }
    } catch (error) {
        log.error('Error exporting data', error);
        Alert.alert(t('common.error'), t('export.errorMessage') || t('common.error'));
    }
};
