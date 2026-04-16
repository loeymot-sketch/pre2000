// Helper utility to parse bullet points from V3 data
// Add to src/utils/textParsers.ts

export const parseBullets = (text: string | undefined): string[] => {
    if (!text) return [];

    // Handle both formats:
    // Format 1: "• Bullet 1\n• Bullet 2\n• Bullet 3"
    // Format 2: "* * Bullet 1\n* * Bullet 2"

    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            // Remove leading bullets/asterisks
            return line.replace(/^[•\*\-]+\s*/, '').trim();
        })
        .filter(line => line.length > 0);
};

export const cleanText = (text: string | undefined): string => {
    if (!text) return '';
    // Remove excessive whitespace
    return text.trim().replace(/\s+/g, ' ');
};
