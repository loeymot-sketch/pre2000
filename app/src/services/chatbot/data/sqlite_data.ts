import { Article, RedFlag, ChatbotSuggestion } from '../../../types';
import { ChatbotRepository } from './repository';
import { databaseService } from './DatabaseService';

export class SqliteChatbotRepository implements ChatbotRepository {

    async getArticles(): Promise<Article[]> {
        const db = databaseService.getDatabase();
        if (!db) return [];

        const rows = await db.getAllAsync<any>(`
            SELECT * FROM articles
        `);

        return rows.map(row => ({
            article_id: row.id,
            title_fr: row.title_fr,
            title_ar: row.title_ar || '',
            title_en: row.title_en || '',
            title_tn: row.title_tn || '',
            summary_fr: row.summary_fr,
            summary_ar: row.summary_ar || '',
            summary_en: row.summary_en || '',
            summary_tn: row.summary_tn || '',
            content_markdown_fr: row.content_fr,
            content_markdown_ar: row.content_ar || '',
            content_markdown_en: row.content_en || '',
            content_markdown_tn: row.content_tn || '',
            category: row.category,
            related_articles_ids: [],
            language: 'fr',
            slug: '',
            risk_level: row.risk_level === 2 ? 'critique' : row.risk_level === 1 ? 'sensible' : 'normal',
            week_links: '',
            related_supplements_ids: []
        }));
    }

    async getRedFlags(): Promise<RedFlag[]> {
        const db = databaseService.getDatabase();
        if (!db) return [];

        // Use GROUP_CONCAT to get linked IDs in one query
        const rows = await db.getAllAsync<any>(`
            SELECT rf.*, GROUP_CONCAT(rfa.article_id) as linked_ids, GROUP_CONCAT(rfk.keyword_id) as keyword_ids
            FROM red_flags rf
            LEFT JOIN red_flag_articles rfa ON rf.id = rfa.red_flag_id
            LEFT JOIN red_flag_keywords rfk ON rf.id = rfk.red_flag_id
            GROUP BY rf.id
        `);

        // We also need the actual keywords text for the engine
        // This is a bit complex with just IDs. 
        // For Phase 2, we might want to change how KeywordEngine works (pass IDs instead of strings).
        // BUT for backward compatibility with KeywordEngine (which takes string[]), we need the words.

        // Let's fetch all keywords first to map them
        const keywords = await db.getAllAsync<{ id: number, word: string }>('SELECT id, word FROM keywords');
        const keywordMap = new Map(keywords.map(k => [k.id, k.word]));

        return rows.map(row => {
            const kIds = row.keyword_ids ? String(row.keyword_ids).split(',').map(Number) : [];
            const keywordStrings = kIds.map(id => keywordMap.get(id) || '').filter(s => s).join(', ');

            return {
                red_flag_id: row.id,
                label_fr: row.label_fr,
                label_ar: row.label_ar || '',
                label_en: row.label_en || '',
                label_tn: row.label_tn || '',
                severity: row.severity,
                standard_message_fr: row.message_fr,
                standard_message_ar: row.message_ar || '',
                standard_message_en: row.message_en || '',
                standard_message_tn: row.message_tn || '',
                keywords_fr: row.keywords_fr || keywordStrings,
                keywords_ar: row.keywords_ar || '',
                keywords_en: row.keywords_en || '',
                keywords_tn: row.keywords_tn || '',
                linked_articles_ids: row.linked_ids ? String(row.linked_ids).split(',') : []
            };
        });
    }

    async getSuggestions(): Promise<ChatbotSuggestion[]> {
        const db = databaseService.getDatabase();
        if (!db) return [];

        const rows = await db.getAllAsync<any>(`
            SELECT s.*, 
                   GROUP_CONCAT(DISTINCT sa.article_id) as linked_articles,
                   GROUP_CONCAT(DISTINCT srf.red_flag_id) as linked_flags
            FROM suggestions s
            LEFT JOIN suggestion_articles sa ON s.id = sa.suggestion_id
            LEFT JOIN suggestion_red_flags srf ON s.id = srf.suggestion_id
            GROUP BY s.id
        `);

        return rows.map(row => ({
            suggestion_id: row.id,
            label_fr: row.label_fr,
            label_ar: row.label_ar || '',
            label_en: row.label_en || '',
            label_tn: row.label_tn || '',
            topic: row.topic,
            linked_article_ids: row.linked_articles || '',
            linked_red_flag_ids: row.linked_flags || '',
            sources: ''
        }));
    }
}
