import { theme } from '../../theme';

export type BadgeVariant =
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'primary';

export type BadgeSize = 'small' | 'medium';

export interface BadgeColorTokens {
    bg: string;
    text: string;
}

export interface BadgeSizeTokens {
    paddingVertical: number;
    paddingHorizontal: number;
    fontSize: number;
}

/**
 * Pure helper — variant → palette (background à ~14% opacité, text en couleur pleine).
 */
export function getBadgeColors(variant: BadgeVariant): BadgeColorTokens {
    switch (variant) {
        case 'success':
            return { bg: theme.colors.badgeSuccessBgAlpha, text: theme.colors.green800 };
        case 'warning':
            return { bg: theme.colors.badgeWarningBgAlpha, text: theme.colors.orange900 };
        case 'error':
            return { bg: theme.colors.badgeErrorBgAlpha, text: theme.colors.red800 };
        case 'info':
            return { bg: theme.colors.badgeInfoBgAlpha, text: theme.colors.info };
        case 'primary':
            return { bg: theme.colors.badgeAccentBgAlpha, text: theme.colors.accent };
        case 'neutral':
        default:
            return { bg: theme.colors.borderLight, text: theme.colors.textSecondary };
    }
}

export function getBadgeSize(size: BadgeSize): BadgeSizeTokens {
    if (size === 'small') {
        return { paddingVertical: 2, paddingHorizontal: 8, fontSize: 12 };
    }
    return { paddingVertical: 4, paddingHorizontal: 10, fontSize: 14 };
}
