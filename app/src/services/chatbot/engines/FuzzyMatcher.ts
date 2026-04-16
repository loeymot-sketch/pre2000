/**
 * Fuzzy Matcher using Levenshtein Distance
 * Helps correct typos in user queries.
 */

export class FuzzyMatcher {
    /**
     * Calculate Levenshtein distance between two strings
     */
    private static levenshtein(a: string, b: string): number {
        const matrix = [];

        // Increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Find the closest match for a word in a list of candidates
     * @param word The word to correct
     * @param candidates List of valid words (keywords)
     * @param threshold Max distance allowed (default 2)
     */
    static findClosestMatch(word: string, candidates: string[], threshold: number = 2): string | null {
        if (word.length < 4) return null; // Don't correct short words

        let bestMatch = null;
        let minDistance = Infinity;

        for (const candidate of candidates) {
            const distance = this.levenshtein(word, candidate);
            if (distance <= threshold && distance < minDistance) {
                minDistance = distance;
                bestMatch = candidate;
            }
        }

        return bestMatch;
    }

    /**
     * Correct a sentence by replacing misspelled words with their closest matches
     */
    static correctSentence(sentence: string, vocabulary: Set<string>): string {
        const words = sentence.toLowerCase().split(/[\s,.;?!]+/);
        const correctedWords = words.map(word => {
            if (vocabulary.has(word)) return word;
            const match = this.findClosestMatch(word, Array.from(vocabulary));
            return match || word;
        });
        return correctedWords.join(' ');
    }
}
