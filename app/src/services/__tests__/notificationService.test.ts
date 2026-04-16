import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
    requestNotificationPermissions,
    scheduleReminderNotification,
    cancelReminderNotifications,
    scheduleMultipleReminders
} from '../notificationService';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('../../utils/logger', () => ({
    createLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        success: jest.fn(),
    }),
}));
jest.mock('../../utils/notificationMessages', () => ({
    getReminderMessage: jest.fn(() => ({
        title: 'Test Title',
        body: 'Test Body',
    })),
}));

describe('NotificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Device as any).isDevice = true;
    });

    describe('requestNotificationPermissions', () => {
        it('should return false if not on a physical device', async () => {
            (Device as any).isDevice = false;
            const result = await requestNotificationPermissions();
            expect(result).toBe(false);
        });

        it('should return true if permissions are already granted', async () => {
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            const result = await requestNotificationPermissions();
            expect(result).toBe(true);
            expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
        });

        it('should request permissions if status is undetermined', async () => {
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
            (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            const result = await requestNotificationPermissions();
            expect(result).toBe(true);
            expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
        });

        it('should set notification channel on Android', async () => {
            Platform.OS = 'android';
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            await requestNotificationPermissions();
            expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.any(Object));
            Platform.OS = 'ios'; // Reset
        });
    });

    describe('scheduleReminderNotification', () => {
        it('should schedule a notification with correct parameters', async () => {
            (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-123');
            const result = await scheduleReminderNotification('rem-1', 'Title', 'Body', 8, 30);

            expect(result).toBe('notif-123');
            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
                content: expect.objectContaining({
                    title: 'Title',
                    body: 'Body',
                    data: { type: 'reminder', reminderId: 'rem-1' }
                }),
                trigger: expect.objectContaining({
                    hour: 8,
                    minute: 30,
                    repeats: true
                })
            }));
        });

        it('should return null on error', async () => {
            (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(new Error('Scheduling failed'));
            const result = await scheduleReminderNotification('rem-1', 'Title', 'Body', 8, 30);
            expect(result).toBeNull();
        });
    });

    describe('cancelReminderNotifications', () => {
        it('should cancel notifications matching the reminderId', async () => {
            const mockScheduled = [
                { identifier: '1', content: { data: { reminderId: 'rem-1' } } },
                { identifier: '2', content: { data: { reminderId: 'rem-2' } } },
                { identifier: '3', content: { data: { reminderId: 'rem-1_8' } } }, // Variant
            ];
            (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(mockScheduled);

            await cancelReminderNotifications('rem-1');

            expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
            expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('1');
            expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('3');
            expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('2');
        });
    });
});
