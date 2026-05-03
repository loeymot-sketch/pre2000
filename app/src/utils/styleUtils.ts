import { theme } from '../theme';
import { Platform, ViewStyle, TextStyle } from 'react-native';

/**
 * Generates cross-platform shadow styles.
 * - Web: Uses `boxShadow`
 * - iOS: Uses `shadow*` props
 * - Android: Uses `elevation`
 * 
 * @param elevation - Android elevation level (default: 5)
 * @param color - Shadow color (default: theme.colors.black)
 * @param opacity - Shadow opacity (default: 0.2)
 * @param radius - Shadow radius (default: 4)
 * @param offset - Shadow offset (default: { width: 0, height: 2 })
 */
export const getShadowStyle = (
    elevation: number = 5,
    color: string = theme.colors.black,
    opacity: number = 0.2,
    radius: number = 4,
    offset: { width: number; height: number } = { width: 0, height: 2 }
): ViewStyle => {
    if (Platform.OS === 'android') {
        return {
            elevation,
            shadowColor: color,
        };
    }

    if (Platform.OS === 'web') {
        return {
            // @ts-ignore - boxShadow is valid on web but might not be in RN types yet
            boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${hexToRgba(color, opacity)}`,
        };
    }

    // iOS
    return {
        shadowColor: color,
        shadowOffset: offset,
        shadowOpacity: opacity,
        shadowRadius: radius,
    };
};

/**
 * Generates cross-platform text shadow styles.
 * - Web: Uses `textShadow`
 * - iOS/Android: Uses `textShadow*` props
 */
export const getTextShadowStyle = (
    color: string = theme.colors.black,
    opacity: number = 0.2,
    radius: number = 4,
    offset: { width: number; height: number } = { width: 0, height: 2 }
): TextStyle => {
    const shadowColor = hexToRgba(color, opacity);

    if (Platform.OS === 'web') {
        return {
            // @ts-ignore
            textShadow: `${offset.width}px ${offset.height}px ${radius}px ${shadowColor}`,
        };
    }

    return {
        textShadowColor: shadowColor,
        textShadowOffset: offset,
        textShadowRadius: radius,
    };
};

/** Convert `#RRGGBB` / `#RGB` to `rgba(r,g,b,a)`. Non-hex falls back to black. */
export const hexToRgba = (hex: string, opacity: number): string => {
    const h = hex.trim();
    if (__DEV__ && !/^#([A-Fa-f0-9]{3}){1,2}$/.test(h)) {
        console.warn(
            `[hexToRgba] expected #RGB or #RRGGBB, got ${JSON.stringify(hex)} — using black fallback`
        );
    }
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(h)) {
        c = h.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
    }
    return `rgba(0,0,0,${opacity})`;
};
