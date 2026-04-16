export const theme = {
    colors: {
        primary: '#FF6B9D', // Pink
        secondary: '#FF8FA3', // Light Pink
        accent: '#C2185B', // Darker pink / magenta for highlights
        background: '#FFF5F8', // Very light pink
        surface: '#F8F9FA', // Off-white / light gray often used as background
        onSurface: '#FFFFFF', // White surface
        text: '#4E342E', // Dark Brown
        textSecondary: '#666666', // Secondary text
        textLight: '#8D6E63', // Light Brown
        white: '#FFFFFF',
        error: '#E57373',
        success: '#81C784',
        warning: '#FFB74D',
        info: '#1976D2', // Add info color
        cardBackground: '#FFFFFF',
        border: '#FFC1E3', // Pink border
        borderLight: '#F0F0F0',
        disabled: '#E0E0E0',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        s: 8,
        m: 12,
        l: 16,
        xl: 20,
        card: 16,
        round: 999,
    },
    typography: {
        h1: {
            fontSize: 28,
            fontWeight: 'bold' as const,
            color: '#4E342E',
        },
        h2: {
            fontSize: 22,
            fontWeight: 'bold' as const,
            color: '#4E342E',
        },
        h3: {
            fontSize: 18,
            fontWeight: 'bold' as const,
            color: '#4E342E',
        },
        body: {
            fontSize: 16,
            color: '#4E342E',
            lineHeight: 24,
        },
        caption: {
            fontSize: 14,
            color: '#8D6E63',
        },
    },
};
