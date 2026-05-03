/** Types et données statiques partagés par `OnboardingScreen` (UI-1 split). */

export type PregnancyStatus = 'pregnant' | 'trying' | 'curious' | null;
export type DateMethod = 'ddr' | 'conception';

export const getStepCount = (status: PregnancyStatus): number => {
    switch (status) {
        case 'pregnant':
            return 4;
        case 'trying':
            return 3;
        case 'curious':
            return 3;
        default:
            return 4;
    }
};

/** Comparaisons semaine / fruit (aligné weeks_db.json — MAMAN APPROVED) */
export const WEEK_COMPARISONS: { [key: number]: { emoji: string; label: string } } = {
    1: { emoji: '🌱', label: 'microscopique' },
    2: { emoji: '🌱', label: 'microscopique' },
    3: { emoji: '🌱', label: 'microscopique' },
    4: { emoji: '🌱', label: 'graine_de_pavot' },
    5: { emoji: '🌱', label: 'graine_de_sesame' },
    6: { emoji: '🌱', label: 'lentille' },
    7: { emoji: '🫐', label: 'myrtille' },
    8: { emoji: '🍓', label: 'framboise' },
    9: { emoji: '🫒', label: 'olive' },
    10: { emoji: '🍒', label: 'cerise' },
    11: { emoji: '🍐', label: 'figue' },
    12: { emoji: '🍋', label: 'citron_vert' },
    13: { emoji: '🍑', label: 'peche' },
    14: { emoji: '🍋', label: 'citron' },
    15: { emoji: '🍎', label: 'pomme' },
    16: { emoji: '🥑', label: 'avocat' },
    17: { emoji: '🥑', label: 'avocat' },
    18: { emoji: '🥭', label: 'mangue' },
    19: { emoji: '🥭', label: 'mangue' },
    20: { emoji: '🍌', label: 'banane' },
    21: { emoji: '🥕', label: 'carotte' },
    22: { emoji: '🥭', label: 'papaye' },
    23: { emoji: '🍆', label: 'aubergine' },
    24: { emoji: '🌽', label: 'epi_de_mais' },
    25: { emoji: '🥦', label: 'brocoli' },
    26: { emoji: '🥬', label: 'chou' },
    27: { emoji: '🥬', label: 'chou_rave' },
    28: { emoji: '🍍', label: 'ananas' },
    29: { emoji: '🎃', label: 'courge' },
    30: { emoji: '🥬', label: 'chou_chinois' },
    31: { emoji: '🥥', label: 'noix_de_coco' },
    32: { emoji: '🥒', label: 'concombre' },
    33: { emoji: '🍍', label: 'ananas' },
    34: { emoji: '🍈', label: 'melon' },
    35: { emoji: '🍈', label: 'melon' },
    36: { emoji: '🥬', label: 'laitue_romaine' },
    37: { emoji: '🥬', label: 'bette_a_carde' },
    38: { emoji: '🍉', label: 'pasteque' },
    39: { emoji: '🍉', label: 'pasteque' },
    40: { emoji: '🍉', label: 'pasteque' },
};
