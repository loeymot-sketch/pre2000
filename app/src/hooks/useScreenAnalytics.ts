import { useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { analyticsService } from '../services/analyticsService';

/**
 * useScreenAnalytics — drop-in hook for Firebase screen tracking.
 *
 * Uses useFocusEffect so the view is re-logged every time the screen
 * comes back into focus (tabs, back navigation, modal dismissal).
 *
 * Usage:
 *   useScreenAnalytics('HomeScreen');
 *
 * @param screenName  Exact screen name logged to Firebase Analytics.
 * @param params      Optional extra params sent with the screen_view event.
 */
export const useScreenAnalytics = (
    screenName: string,
    params?: Record<string, string | number | boolean>
): void => {
    const hasFiredRef = useRef(false);

    useFocusEffect(() => {
        // Always log on focus (captures tab switches + back navigation)
        analyticsService.logScreenView(screenName, screenName);

        if (!hasFiredRef.current && params) {
            // Log extra params once on initial mount
            analyticsService.logEvent('screen_params', { screen: screenName, ...params });
            hasFiredRef.current = true;
        }
    });
};
