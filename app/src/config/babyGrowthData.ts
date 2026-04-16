/**
 * Baby Growth Data Configuration
 * 
 * Données mensuelles pour l'affichage de la croissance du bébé
 * avec comparaisons visuelles (fruits/légumes) et faits
 */

export interface BabyGrowthMonth {
    month: number;
    weekStart: number;
    weekEnd: number;
    image: any; // require() image path
    comparison: {
        emoji: string;
        item: string;
        size: string;
        sizeInCm: number;
    };
    facts: string[];
    developmentHighlights: string[];
}

export const BABY_GROWTH_MONTHS: BabyGrowthMonth[] = [
    {
        month: 1,
        weekStart: 1,
        weekEnd: 4,
        image: require('../../assets/images/baby-3d/month-1.png'),
        comparison: {
            emoji: '🌱',
            item: 'common.babyEvolution.month1.comparison',
            size: '2mm',
            sizeInCm: 0.2,
        },
        facts: [
            'common.babyEvolution.month1.facts.0',
            'common.babyEvolution.month1.facts.1',
            'common.babyEvolution.month1.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month1.highlights.0',
            'common.babyEvolution.month1.highlights.1',
        ],
    },
    {
        month: 2,
        weekStart: 5,
        weekEnd: 8,
        image: require('../../assets/images/baby-3d/month-2.png'),
        comparison: {
            emoji: '🫐',
            item: 'common.babyEvolution.month2.comparison',
            size: '1.5cm',
            sizeInCm: 1.5,
        },
        facts: [
            'common.babyEvolution.month2.facts.0',
            'common.babyEvolution.month2.facts.1',
            'common.babyEvolution.month2.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month2.highlights.0',
            'common.babyEvolution.month2.highlights.1',
        ],
    },
    {
        month: 3,
        weekStart: 9,
        weekEnd: 13,
        image: require('../../assets/images/baby-3d/month-3.png'),
        comparison: {
            emoji: '🍑',
            item: 'common.babyEvolution.month3.comparison',
            size: '3cm',
            sizeInCm: 3,
        },
        facts: [
            'common.babyEvolution.month3.facts.0',
            'common.babyEvolution.month3.facts.1',
            'common.babyEvolution.month3.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month3.highlights.0',
            'common.babyEvolution.month3.highlights.1',
        ],
    },
    {
        month: 4,
        weekStart: 14,
        weekEnd: 17,
        image: require('../../assets/images/baby-3d/month-4.png'),
        comparison: {
            emoji: '🥑',
            item: 'common.babyEvolution.month4.comparison',
            size: '9cm',
            sizeInCm: 9,
        },
        facts: [
            'common.babyEvolution.month4.facts.0',
            'common.babyEvolution.month4.facts.1',
            'common.babyEvolution.month4.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month4.highlights.0',
            'common.babyEvolution.month4.highlights.1',
        ],
    },
    {
        month: 5,
        weekStart: 18,
        weekEnd: 22,
        image: require('../../assets/images/baby-3d/month-5.png'),
        comparison: {
            emoji: '🥭',
            item: 'common.babyEvolution.month5.comparison',
            size: '14cm',
            sizeInCm: 14,
        },
        facts: [
            'common.babyEvolution.month5.facts.0',
            'common.babyEvolution.month5.facts.1',
            'common.babyEvolution.month5.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month5.highlights.0',
            'common.babyEvolution.month5.highlights.1',
        ],
    },
    {
        month: 6,
        weekStart: 23,
        weekEnd: 27,
        image: require('../../assets/images/baby-3d/month-6.png'),
        comparison: {
            emoji: '🌽',
            item: 'common.babyEvolution.month6.comparison',
            size: '20cm',
            sizeInCm: 20,
        },
        facts: [
            'common.babyEvolution.month6.facts.0',
            'common.babyEvolution.month6.facts.1',
            'common.babyEvolution.month6.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month6.highlights.0',
            'common.babyEvolution.month6.highlights.1',
        ],
    },
    {
        month: 7,
        weekStart: 28,
        weekEnd: 31,
        image: require('../../assets/images/baby-3d/month-7.png'),
        comparison: {
            emoji: '🥬',
            item: 'common.babyEvolution.month7.comparison',
            size: '26cm',
            sizeInCm: 26,
        },
        facts: [
            'common.babyEvolution.month7.facts.0',
            'common.babyEvolution.month7.facts.1',
            'common.babyEvolution.month7.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month7.highlights.0',
            'common.babyEvolution.month7.highlights.1',
        ],
    },
    {
        month: 8,
        weekStart: 32,
        weekEnd: 35,
        image: require('../../assets/images/baby-3d/month-8.png'),
        comparison: {
            emoji: '🍍',
            item: 'common.babyEvolution.month8.comparison',
            size: '32cm',
            sizeInCm: 32,
        },
        facts: [
            'common.babyEvolution.month8.facts.0',
            'common.babyEvolution.month8.facts.1',
            'common.babyEvolution.month8.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month8.highlights.0',
            'common.babyEvolution.month8.highlights.1',
        ],
    },
    {
        month: 9,
        weekStart: 36,
        weekEnd: 40,
        image: require('../../assets/images/baby-3d/month-9.png'),
        comparison: {
            emoji: '🍉',
            item: 'common.babyEvolution.month9.comparison',
            size: '48cm',
            sizeInCm: 48,
        },
        facts: [
            'common.babyEvolution.month9.facts.0',
            'common.babyEvolution.month9.facts.1',
            'common.babyEvolution.month9.facts.2',
        ],
        developmentHighlights: [
            'common.babyEvolution.month9.highlights.0',
            'common.babyEvolution.month9.highlights.1',
        ],
    },
];

/**
 * Get baby growth data for a specific week
 */
export const getBabyGrowthForWeek = (week: number): BabyGrowthMonth => {
    // Clamp week between 1 and 40
    const clampedWeek = Math.max(1, Math.min(40, week));

    // Find the month data that contains this week
    const monthData = BABY_GROWTH_MONTHS.find(
        month => clampedWeek >= month.weekStart && clampedWeek <= month.weekEnd
    );

    // Fallback to last month if somehow not found
    return monthData || BABY_GROWTH_MONTHS[8];
};

/**
 * Get all growth data for evolution view
 */
export const getAllBabyGrowthData = (): BabyGrowthMonth[] => {
    return BABY_GROWTH_MONTHS;
};
