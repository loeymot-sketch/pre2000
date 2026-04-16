import { createLogger } from '../utils/logger';
const log = createLogger('WeekRecommendationsScreen');
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCurrentWeek } from '../services/useCurrentWeek';
import { Article, Supplement } from '../types';
import { getLocalizedContent } from '../utils/i18nHelpers';
import { theme } from '../theme';
import { Card } from '../components/common/Card';
import { SectionHeader } from '../components/common/SectionHeader';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

export const WeekRecommendationsScreen = () => {
    useScreenAnalytics('WeekRecommendationsScreen');
    const { weekData, loading: weekLoading } = useCurrentWeek();
    const [articles, setArticles] = useState<Article[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!weekData) return;

            try {
                // Fetch recommended articles
                const articleIds = (weekData.recommended_articles_ids || '').split(',').filter(Boolean);
                const articlePromises = articleIds.map((id: string) =>
                    getDoc(doc(db, 'articles', id.trim()))
                );
                const articleDocs = await Promise.all(articlePromises);
                const fetchedArticles = articleDocs
                    .filter((doc: any) => doc.exists())
                    .map((doc: any) => doc.data() as Article);
                setArticles(fetchedArticles);

                // Fetch recommended supplements
                const supplementIds = (weekData.recommended_supplements_ids || '').split(',').filter(Boolean);
                const supplementPromises = supplementIds.map((id: string) =>
                    getDoc(doc(db, 'supplements', id.trim()))
                );
                const supplementDocs = await Promise.all(supplementPromises);
                const fetchedSupplements = supplementDocs
                    .filter((doc: any) => doc.exists())
                    .map((doc: any) => doc.data() as Supplement);
                setSupplements(fetchedSupplements);
            } catch (error) {
                log.error('Error fetching recommendations:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!weekLoading && weekData) {
            fetchRecommendations();
        }
    }, [weekData, weekLoading]);

    if (weekLoading || loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const getSafetyColor = (safety: string) => {
        switch (safety) {
            case 'ok': return theme.colors.success;
            case 'a_surveiller': return theme.colors.warning;
            case 'deconseille': return theme.colors.error;
            default: return theme.colors.secondary;
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {articles.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader title={t('common.recommendedArticles')} />
                    {articles.map((article) => (
                        <TouchableOpacity
                            key={article.article_id}
                            onPress={() => navigation.navigate('ArticleDetail', { articleId: article.article_id })}
                            activeOpacity={0.7}
                        >
                            <Card style={styles.card}>
                                <View style={styles.iconContainer}>
                                    <Text style={styles.icon}>📚</Text>
                                </View>
                                <View style={styles.content}>
                                    <Text style={[theme.typography.h3, styles.title] as any}>{getLocalizedContent(article, 'title', i18n.language)}</Text>
                                    <Text numberOfLines={2} style={[theme.typography.body, styles.summary]}>
                                        {getLocalizedContent(article, 'summary', i18n.language) || t('common.seeMore')}
                                    </Text>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {supplements.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader title={t('common.recommendedSupplements')} />
                    {supplements.map((supplement) => (
                        <TouchableOpacity
                            key={supplement.supplement_id}
                            onPress={() => navigation.navigate('SupplementDetail', { supplementId: supplement.supplement_id })}
                            activeOpacity={0.7}
                        >
                            <Card style={styles.card}>
                                <View style={[styles.iconContainer, { backgroundColor: getSafetyColor(supplement.pregnancy_safety) }]}>
                                    <Text style={styles.icon}>💊</Text>
                                </View>
                                <View style={styles.content}>
                                    <Text style={[theme.typography.h3, styles.title] as any}>{getLocalizedContent(supplement, 'name', i18n.language)}</Text>
                                    <Text numberOfLines={2} style={[theme.typography.body, styles.summary]}>
                                        {getLocalizedContent(supplement, 'short_description', i18n.language)}
                                    </Text>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {articles.length === 0 && supplements.length === 0 && (
                <View style={styles.centerContainer}>
                    <Text style={theme.typography.body}>{t('common.noRecommendation')}</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.l,
    },
    section: {
        marginBottom: theme.spacing.l,
    },
    card: {
        marginBottom: theme.spacing.m,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    iconContainer: {
        width: 60,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 28,
    },
    content: {
        flex: 1,
        padding: theme.spacing.m,
    },
    title: {
        marginBottom: theme.spacing.xs,
    },
    summary: {
        color: theme.colors.textLight,
        lineHeight: 20,
    },
});
