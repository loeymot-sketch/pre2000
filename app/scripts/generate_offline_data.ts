const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../');
const APP_DATA_DIR = path.join(__dirname, '../src/data');

// Paths to source JSONs
const ARTICLES_JSON = path.join(ROOT_DIR, 'articles_db.json');
const RED_FLAGS_JSON = path.join(ROOT_DIR, 'red_flags_db.json');
const SUGGESTIONS_JSON = path.join(ROOT_DIR, 'chatbot_suggestions.json');
const ARTICLES_CONTENT_DIR = path.join(ROOT_DIR, 'articles');

// Output file
const OUTPUT_FILE = path.join(APP_DATA_DIR, 'chatbot_data.ts');

async function generateData() {
    console.log('🚀 Generating offline chatbot data...');

    // 1. Read JSONs
    if (!fs.existsSync(ARTICLES_JSON) || !fs.existsSync(RED_FLAGS_JSON) || !fs.existsSync(SUGGESTIONS_JSON)) {
        console.error("❌ Missing source JSON files");
        return;
    }

    const articles = JSON.parse(fs.readFileSync(ARTICLES_JSON, 'utf-8'));
    const redFlags = JSON.parse(fs.readFileSync(RED_FLAGS_JSON, 'utf-8'));
    const suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_JSON, 'utf-8'));

    console.log(`   Loaded ${articles.length} articles`);
    console.log(`   Loaded ${redFlags.length} red flags`);
    console.log(`   Loaded ${suggestions.length} suggestions`);

    // 2. Embed Markdown Content
    console.log('📦 Embedding markdown content...');
    const enrichedArticles = articles.map((article: any) => {
        let contentFr = '';
        if (article.content_source_path) {
            const mdPath = path.join(ARTICLES_CONTENT_DIR, article.content_source_path);
            if (fs.existsSync(mdPath)) {
                contentFr = fs.readFileSync(mdPath, 'utf-8');
            } else {
                console.warn(`   ⚠️ Markdown file not found: ${article.content_source_path}`);
            }
        }

        // Clean up article object — includes ALL required fields from Article interface
        return {
            article_id: article.article_id,
            slug: article.slug,
            category: article.category,
            title_fr: article.title_fr,
            title_en: article.title_en || '',
            title_ar: article.title_ar || '',
            title_tn: article.title_tn || null,
            summary_fr: article.summary_fr,
            summary_en: article.summary_en || '',
            summary_ar: article.summary_ar || '',
            summary_tn: article.summary_tn || null,
            content_markdown_fr: contentFr || article.content_markdown_fr || '',
            content_markdown_en: article.content_markdown_en || '',
            content_markdown_ar: article.content_markdown_ar || '',
            content_markdown_tn: article.content_markdown_tn || null,
            content_source_path: article.content_source_path || undefined,
            risk_level: article.risk_level || 'normal', // ✅ FIX: Include risk_level
            week_links: article.week_links || '',
            related_articles_ids: article.related_articles_ids
                ? (typeof article.related_articles_ids === 'string'
                    ? article.related_articles_ids.split(',').map((s: any) => s.trim()).filter(Boolean)
                    : article.related_articles_ids)
                : [],
            related_supplements_ids: article.related_supplements_ids
                ? (typeof article.related_supplements_ids === 'string'
                    ? article.related_supplements_ids.split(',').map((s: any) => s.trim()).filter(Boolean)
                    : article.related_supplements_ids)
                : [],
            note_localisation: article.note_localisation || undefined,
            language: article.language || undefined,
        };
    });

    // 3. Clean up red flags
    const cleanRedFlags = redFlags.map((rf: any) => ({
        red_flag_id: rf.red_flag_id,
        label_fr: rf.label_fr,
        label_ar: rf.label_ar || '',
        label_en: rf.label_en || '',
        label_tn: rf.label_tn || null,
        keywords_fr: rf.keywords_fr,
        keywords_ar: rf.keywords_ar || '',
        keywords_en: rf.keywords_en || '',
        keywords_tn: rf.keywords_tn || null,
        severity: rf.severity,
        standard_message_fr: rf.standard_message_fr,
        standard_message_ar: rf.standard_message_ar || '',
        standard_message_en: rf.standard_message_en || '',
        standard_message_tn: rf.standard_message_tn || null,
        linked_articles_ids: Array.isArray(rf.linked_articles_ids)
            ? rf.linked_articles_ids
            : (rf.linked_articles_ids ? rf.linked_articles_ids.split(',').map((s: any) => s.trim()).filter(Boolean) : []),
        sources: rf.sources || undefined,
    }));

    // 4. Clean chatbot suggestions — ✅ FIX: Only include fields from ChatbotSuggestion type
    // The type has: suggestion_id, label_fr, label_ar, label_en, label_tn, topic,
    // linked_article_ids, linked_red_flag_ids, linked_tip_ids, linked_task_ids, sources
    // It does NOT have title_tn or desc_tn
    const cleanSuggestions = suggestions.map((s: any) => ({
        suggestion_id: s.suggestion_id,
        label_fr: s.label_fr,
        label_ar: s.label_ar || '',
        label_en: s.label_en || '',
        label_tn: s.label_tn || s.title_tn || null, // Map title_tn → label_tn if needed
        topic: s.topic,
        linked_article_ids: s.linked_article_ids || '',
        linked_red_flag_ids: s.linked_red_flag_ids || undefined,
        linked_tip_ids: s.linked_tip_ids || undefined,
        linked_task_ids: s.linked_task_ids || undefined,
        sources: s.sources || undefined,
    }));

    // 5. Generate TS File
    const fileContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * Generated by scripts/generate_offline_data.ts
 * Generated at: ${new Date().toISOString()}
 */

import { Article, RedFlag, ChatbotSuggestion } from '../types';

export const ARTICLES: Article[] = ${JSON.stringify(enrichedArticles, null, 2)};

export const RED_FLAGS: RedFlag[] = ${JSON.stringify(cleanRedFlags, null, 2)};

export const SUGGESTIONS: ChatbotSuggestion[] = ${JSON.stringify(cleanSuggestions, null, 2)};
`;

    // Ensure directory exists
    if (!fs.existsSync(APP_DATA_DIR)) {
        fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, fileContent);
    console.log(`✅ Generated ${OUTPUT_FILE}`);
    console.log(`   Articles: ${enrichedArticles.length}`);
    console.log(`   Red Flags: ${cleanRedFlags.length}`);
    console.log(`   Suggestions: ${cleanSuggestions.length}`);
}

generateData().catch(console.error);
