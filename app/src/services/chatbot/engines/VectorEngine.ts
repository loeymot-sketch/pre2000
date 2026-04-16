/**
 * VectorEngine - Semantic Search using TF-IDF style word vectors
 * 
 * This is a lightweight pure-JS implementation for on-device semantic search.
 * It uses word frequency vectors (TF-IDF style) to find semantically similar content.
 * 
 * For more advanced embeddings, we can later integrate a TFLite model.
 */

import { createLogger } from '../../../utils/logger';

const log = createLogger('VectorEngine');

// Common French + Arabic stopwords to ignore
const STOPWORDS = new Set([
    // French
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'ce', 'cette',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or',
    'que', 'qui', 'quoi', 'dont',
    'pour', 'avec', 'sans', 'par', 'sur', 'sous', 'dans', 'en',
    'est', 'sont', 'avoir', 'avons', 'avez', 'ont',
    'suis', 'sommes',
    'ne', 'pas', 'plus', 'bien', 'mal',
    // Arabic / TN stopwords
    'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'هو', 'هي',
    'كان', 'يكون', 'كانت', 'التي', 'الذي', 'أو', 'و', 'ثم', 'لكن',
    'لا', 'لم', 'لن', 'نحن', 'أنا', 'أنت', 'هم', 'هن', 'ما', 'كل',
    // BUG-07 FIX: Tunisian dialectal function words (تاع = "of/belonging", بش = "to/in order to", etc.)
    'تاع', 'تاعي', 'تاعك', 'تاعو', 'تاعها', 'تاعنا', 'تاعكم', 'تاعهم',
    'بش', 'باش', 'كيفاش', 'علاش', 'وقتاش', 'فيه', 'فيها', 'فيهم',
    'هاذا', 'هاذي', 'هاك', 'هاكا', 'برشا', 'شوية', 'كان', 'يعني',
    'توة', 'بكري', 'هنا', 'هناية', 'الله', 'يزي', 'اللي', 'إللي',
]);

interface DocumentVector {
    id: string;
    vector: Map<string, number>;
    magnitude: number;
    title: string;
}

export class VectorEngine {
    private documents: DocumentVector[] = [];
    private idf: Map<string, number> = new Map();
    private vocabulary: Set<string> = new Set();

    /**
     * Tokenize and normalize text
     */
    private tokenize(text: string): string[] {
        // Detect if text contains Arabic characters (U+0600-U+06FF)
        const hasArabic = /[\u0600-\u06FF]/.test(text);

        if (hasArabic) {
            // Arabic tokenizer: keep Arabic characters + digits, split on everything else
            return text
                .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 1 && !STOPWORDS.has(word));
        }

        // Latin tokenizer (French/English): normalize and strip accents
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !STOPWORDS.has(word));
    }

    /**
     * Calculate term frequency for a document
     */
    private calculateTF(tokens: string[]): Map<string, number> {
        const tf = new Map<string, number>();
        const total = tokens.length;

        tokens.forEach(token => {
            tf.set(token, (tf.get(token) || 0) + 1);
        });

        // Normalize by document length
        tf.forEach((count, term) => {
            tf.set(term, count / total);
        });

        return tf;
    }

    /**
     * Calculate vector magnitude for cosine similarity
     */
    private calculateMagnitude(vector: Map<string, number>): number {
        let sum = 0;
        vector.forEach(value => {
            sum += value * value;
        });
        return Math.sqrt(sum);
    }

    /**
     * Index documents for semantic search
     */
    indexDocuments(documents: { id: string; title: string; content: string }[]) {
        log.info(`Indexing ${documents.length} documents...`);

        // First pass: collect all terms and document frequencies
        const docFrequency = new Map<string, number>();

        documents.forEach(doc => {
            const tokens = new Set(this.tokenize(doc.title + ' ' + doc.content));
            tokens.forEach(token => {
                this.vocabulary.add(token);
                docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
            });
        });

        // Calculate IDF
        const N = documents.length;
        docFrequency.forEach((df, term) => {
            this.idf.set(term, Math.log(N / (1 + df)));
        });

        // Second pass: create TF-IDF vectors
        this.documents = documents.map(doc => {
            const tokens = this.tokenize(doc.title + ' ' + doc.content);
            const tf = this.calculateTF(tokens);

            const vector = new Map<string, number>();
            tf.forEach((tfValue, term) => {
                const idfValue = this.idf.get(term) || 0;
                vector.set(term, tfValue * idfValue);
            });

            return {
                id: doc.id,
                title: doc.title,
                vector,
                magnitude: this.calculateMagnitude(vector)
            };
        });

        log.success(`Indexed ${this.documents.length} documents with ${this.vocabulary.size} unique terms`);
    }

    /**
     * Calculate cosine similarity between query and document
     */
    private cosineSimilarity(queryVector: Map<string, number>, queryMagnitude: number, doc: DocumentVector): number {
        if (queryMagnitude === 0 || doc.magnitude === 0) return 0;

        let dotProduct = 0;
        queryVector.forEach((value, term) => {
            const docValue = doc.vector.get(term) || 0;
            dotProduct += value * docValue;
        });

        return dotProduct / (queryMagnitude * doc.magnitude);
    }

    /**
     * Search for semantically similar documents
     */
    search(query: string, topK: number = 5): { id: string; title: string; score: number }[] {
        const tokens = this.tokenize(query);
        const tf = this.calculateTF(tokens);

        // Create query vector
        const queryVector = new Map<string, number>();
        tf.forEach((tfValue, term) => {
            const idfValue = this.idf.get(term) || 0;
            queryVector.set(term, tfValue * idfValue);
        });

        const queryMagnitude = this.calculateMagnitude(queryVector);

        // Score all documents
        const results = this.documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            score: this.cosineSimilarity(queryVector, queryMagnitude, doc)
        }));

        // Sort by score and return top K
        return results
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Check if engine is ready
     */
    isReady(): boolean {
        return this.documents.length > 0;
    }
}

export const vectorEngine = new VectorEngine();
