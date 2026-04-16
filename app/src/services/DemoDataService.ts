import { db, auth } from '../config/firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { logger } from '../utils/logger';

/**
 * Service to populate the app with "Perfect" data for marketing screenshots.
 * ONLY AVAILABLE IN __DEV__ MODE.
 */
export const DemoDataService = {
    /**
     * Inject demo data for a "Perfect Pregnancy" at Week 28
     */
    injectDemoData: async () => {
        if (!__DEV__) {
            logger.warn('DemoData', 'Demo data injection is disabled in production.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            logger.error('DemoData', 'No user connected');
            return;
        }

        const userId = user.uid;
        logger.info('DemoData', `Injecting demo data for user ${userId}...`);

        try {
            const batch = writeBatch(db);

            // 1. Profile (Week 28)
            // LMP = Today - (28 weeks * 7 days)
            const daysAgo28Weeks = 28 * 7;
            const lmpDate = new Date();
            lmpDate.setDate(lmpDate.getDate() - daysAgo28Weeks);

            const userRef = doc(db, 'users', userId);
            batch.set(userRef, {
                name: 'Sarah',
                email: user.email,
                lmp: lmpDate.toISOString(),
                height: 165,
                startWeight: 60,
                createdAt: new Date().toISOString(),
                language: 'fr', // Default, can be changed in settings
                onboardingCompleted: true,
                termsAccepted: true,
                privacyAccepted: true
            }, { merge: true });

            // 2. Weight History (Healthy Curve)
            // Start: 60kg. Now (Week 28): ~69kg (+9kg)
            const weightCollection = collection(db, 'users', userId, 'weights');

            // Add 5 data points
            const weights = [
                { week: 0, weight: 60 },
                { week: 8, weight: 61.5 },
                { week: 16, weight: 64 },
                { week: 24, weight: 67.5 },
                { week: 28, weight: 69.2 } // Current
            ];

            for (const w of weights) {
                const wDate = new Date(lmpDate);
                wDate.setDate(wDate.getDate() + (w.week * 7));
                // Use a deterministic ID for idempotency
                const wRef = doc(weightCollection, `demo_week_${w.week}`);
                batch.set(wRef, {
                    date: wDate.toISOString(),
                    weight: w.weight,
                    note: w.week === 0 ? 'Poids de départ' : ''
                });
            }

            // 3. Appointments (Calendar)
            // One past, Two future
            const eventsCollection = collection(db, 'users', userId, 'events');

            const pastRdvDate = new Date();
            pastRdvDate.setDate(pastRdvDate.getDate() - 14); // 2 weeks ago
            const pastRdvRef = doc(eventsCollection, 'demo_rdv_past');
            batch.set(pastRdvRef, {
                title: 'Échographie T2',
                date: pastRdvDate.toISOString(),
                type: 'appointment',
                notes: 'Tout va bien ! C\'est une fille 👧',
                location: 'Clinique Pasteur',
                week: 26
            });

            const futureRdvDate = new Date();
            futureRdvDate.setDate(futureRdvDate.getDate() + 4); // In 4 days
            futureRdvDate.setHours(14, 30, 0, 0);
            const futureRdvRef = doc(eventsCollection, 'demo_rdv_future');
            batch.set(futureRdvRef, {
                title: 'Consultation 7ème mois',
                date: futureRdvDate.toISOString(),
                type: 'appointment',
                notes: 'Préparer questions sur l\'allaitement',
                location: 'Cabinet Dr. Martin',
                week: 29
            });

            // 4. Tasks (My Day)
            // Some checked, some todo
            // We rely on simple storage for tasks usually, but if using Firestore:
            // Assuming tasks are stored in simple collections or local storage.
            // If we use AsyncStorage for tasks (as common in phase 1), we might need a different approach.
            // But let's assume we want to populate at least what's in Firestore.

            // Commit batch
            await batch.commit();
            logger.success('DemoData', 'Injection complete!');

        } catch (e) {
            logger.error('DemoData', 'Failed to inject', e);
            throw e;
        }
    }
};
