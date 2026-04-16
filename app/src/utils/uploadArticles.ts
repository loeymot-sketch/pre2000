import { db } from '../config/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { ARTICLES } from '../data/chatbot_data';
import { createLogger } from './logger';

const log = createLogger('ArticleUploader');

export const uploadArticlesToFirestore = async (onProgress?: (current: number, total: number) => void) => {
    log.info('🚀 Starting article upload...');
    const total = ARTICLES.length;
    let current = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    try {
        for (const article of ARTICLES) {
            const articleRef = doc(db, 'articles', article.article_id);

            // We only upload fields that are present and not empty
            // This ensures we overwrite the incomplete data with complete data
            const dataToUpdate: any = { ...article };

            // Ensure content_markdown_fr is set if it exists in content_fr (legacy field handling)
            if (!dataToUpdate.content_markdown_fr && (article as any).content_fr) {
                dataToUpdate.content_markdown_fr = (article as any).content_fr;
            }

            batch.set(articleRef, dataToUpdate, { merge: true });
            batchCount++;
            current++;

            // Commit batches of 500 (Firestore limit)
            if (batchCount >= 400) {
                await batch.commit();
                log.info(`💾 Committed batch of ${batchCount} articles`);
                batch = writeBatch(db);
                batchCount = 0;
                if (onProgress) onProgress(current, total);
            }
        }

        // Commit remaining
        if (batchCount > 0) {
            await batch.commit();
            log.info(`💾 Committed final batch of ${batchCount} articles`);
        }

        if (onProgress) onProgress(total, total);
        log.success(`✅ Successfully uploaded ${total} articles!`);
        return true;
    } catch (error) {
        log.error('❌ Error uploading articles:', error);
        return false;
    }
};
