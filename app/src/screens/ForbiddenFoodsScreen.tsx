/**
 * ForbiddenFoodsScreen
 * 
 * List of foods to avoid during pregnancy with:
 * - Categories (fish, dairy, meat, etc.)
 * - Risk explanation
 * - Safe alternatives
 * - Search functionality
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { getShadowStyle } from '../utils/styleUtils';
import { getLocalizedContent } from '../utils/i18nHelpers';

// Import data
import forbiddenFoodsData from '../data/forbidden_foods.json';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

interface ForbiddenFood {
    id: string;
    name_fr: string;
    category: string;
    category_name_fr: string;
    risk: string;
    details_fr: string;
    alternative_fr: string;
    icon: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

const foods: ForbiddenFood[] = forbiddenFoodsData as ForbiddenFood[];

// Group by category
const categories = [
    { id: 'drinks', icon: '🍷' },
    { id: 'fish', icon: '🐟' },
    { id: 'dairy', icon: '🧀' },
    { id: 'eggs', icon: '🥚' },
    { id: 'meat', icon: '🥩' },
    { id: 'vegetables', icon: '🥗' },
    { id: 'herbs', icon: '🌿' },
];

const severityColors = {
    critical: '#D32F2F',
    high: '#F57C00',
    medium: '#FFA726',
    low: '#66BB6A',
};

// Removed hardcoded severityLabels, will use t() directly

export const ForbiddenFoodsScreen = () => {
    useScreenAnalytics('ForbiddenFoodsScreen');
    const { t, i18n } = useTranslation();
    const isRTL = ['ar', 'tn'].includes(i18n.language); // ── FIX: RTL layout
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter foods
    const filteredFoods = useMemo(() => {
        let result = foods;

        if (selectedCategory) {
            result = result.filter(f => f.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f =>
                getLocalizedContent(f, 'name', i18n.language).toLowerCase().includes(query) ||
                getLocalizedContent(f, 'risk', i18n.language).toLowerCase().includes(query) ||
                getLocalizedContent(f, 'alternative', i18n.language).toLowerCase().includes(query)
            );
        }

        // Sort by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }, [searchQuery, selectedCategory, i18n.language]);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🍽️ {t('common.toAvoid')}</Text>
                <Text style={styles.subtitle}>
                    {t('common.defaultWarning')}
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('common.searchFoodPlaceholder')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Category Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
                contentContainerStyle={styles.categoriesContainer}
            >
                <TouchableOpacity
                    style={[
                        styles.categoryChip,
                        selectedCategory === null && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(null)}
                >
                    <Text style={[
                        styles.categoryChipText,
                        selectedCategory === null && styles.categoryChipTextActive
                    ]}>{t('forbiddenFoods.all')}</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoryChip,
                            selectedCategory === cat.id && styles.categoryChipActive
                        ]}
                        onPress={() => setSelectedCategory(
                            selectedCategory === cat.id ? null : cat.id
                        )}
                    >
                        <Text style={[
                            styles.categoryChipText,
                            selectedCategory === cat.id && styles.categoryChipTextActive
                        ]}>{cat.icon} {t(`forbiddenFoods.categories.${cat.id}`)}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Results Count */}
            <Text style={styles.resultsCount}>
                {filteredFoods.length} {t('common.foods')}
            </Text>

            {/* Foods List */}
            {filteredFoods.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateEmoji}>🔍</Text>
                    <Text style={styles.emptyStateText}>{t('common.noResults')}</Text>
                </View>
            ) : (
            <View style={styles.foodsList}>
                {filteredFoods.map(food => {
                    const isExpanded = expandedItems.has(food.id);
                    return (
                        <TouchableOpacity
                            key={food.id}
                            style={[
                                styles.foodCard,
                                { borderLeftColor: severityColors[food.severity] }
                            ]}
                            onPress={() => toggleExpand(food.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.foodHeader}>
                                <Text style={styles.foodIcon}>{food.icon}</Text>
                                <View style={styles.foodInfo}>
                                    <Text style={[styles.foodName, isRTL && { textAlign: 'right' }]}>{getLocalizedContent(food, 'name', i18n.language)}</Text>
                                    <View style={[
                                        styles.severityBadge,
                                        { backgroundColor: severityColors[food.severity] + '20' }
                                    ]}>
                                        <Text style={[
                                            styles.severityText,
                                            { color: severityColors[food.severity] }
                                        ]}>{t(`forbiddenFoods.severity.${food.severity}`)}</Text>
                                    </View>
                                </View>
                                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                            </View>

                            {isExpanded && (
                                <View style={styles.foodDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{t('forbiddenFoods.riskLabel')}</Text>
                                        <Text style={styles.detailText}>{getLocalizedContent(food, 'risk', i18n.language)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{t('forbiddenFoods.detailsLabel')}</Text>
                                        <Text style={styles.detailText}>{getLocalizedContent(food, 'details', i18n.language)}</Text>
                                    </View>
                                    <View style={[styles.detailRow, styles.alternativeRow]}>
                                        <Text style={styles.alternativeLabel}>{t('forbiddenFoods.alternativeLabel')}</Text>
                                        <Text style={styles.alternativeText}>{getLocalizedContent(food, 'alternative', i18n.language)}</Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            )}

            {/* Medical Disclaimer */}
            <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                    {t('forbiddenFoods.disclaimer')}
                </Text>
            </View>
        </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#333',
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchInput: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: theme.colors.disabled,
    },
    categoriesScroll: {
        marginBottom: 12,
    },
    categoriesContainer: {
        paddingEnd: 16,
        gap: 8,
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.disabled,
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryChipText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    categoryChipTextActive: {
        color: theme.colors.white,
    },
    resultsCount: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginBottom: 12,
    },
    foodsList: {
        gap: 12,
    },
    foodCard: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        ...getShadowStyle(2, '#000', 0.05, 4, { width: 0, height: 1 }),
    },
    foodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    foodIcon: {
        fontSize: 32,
        marginEnd: 12,
    },
    foodInfo: {
        flex: 1,
    },
    foodName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    severityBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    severityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    expandIcon: {
        fontSize: 12,
        color: '#999',
        marginStart: 8,
    },
    foodDetails: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
    detailRow: {
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    detailText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    alternativeRow: {
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 0,
    },
    alternativeLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2E7D32',
        marginBottom: 4,
    },
    alternativeText: {
        fontSize: 14,
        color: '#2E7D32',
        lineHeight: 20,
    },
    safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateEmoji: { fontSize: 48, marginBottom: 12 },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    disclaimer: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    disclaimerText: {
        fontSize: 12,
        color: '#F57C00',
        lineHeight: 18,
    },
});
