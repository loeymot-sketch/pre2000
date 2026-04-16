/**
 * Database Schema Definitions (Phase 2)
 * Corresponds to the relational schema defined in database_schema.md
 */

export interface DbArticle {
    id: string;
    title_fr: string;
    summary_fr: string;
    content_fr: string;
    category: string;
    risk_level: number; // 0=Normal, 1=Sensible, 2=Critique
}

export interface DbRedFlag {
    id: string;
    label_fr: string;
    severity: 'faible' | 'modéré' | 'élevé' | 'critique';
    message_fr: string;
}

export interface DbSuggestion {
    id: string;
    label_fr: string;
    topic: string;
}

export interface DbKeyword {
    id: number;
    word: string;
    normalized: string;
}

// ==========================================
// JUNCTION TABLES (Relationships)
// ==========================================

export interface DbArticleKeyword {
    article_id: string;
    keyword_id: number;
    weight: number; // 1=Content, 5=Title, 10=Tag
}

export interface DbRedFlagKeyword {
    red_flag_id: string;
    keyword_id: number;
}

export interface DbSuggestionKeyword {
    suggestion_id: string;
    keyword_id: number;
}

export interface DbRedFlagArticle {
    red_flag_id: string;
    article_id: string;
}

export interface DbSuggestionArticle {
    suggestion_id: string;
    article_id: string;
}

export interface DbSuggestionRedFlag {
    suggestion_id: string;
    red_flag_id: string;
}
