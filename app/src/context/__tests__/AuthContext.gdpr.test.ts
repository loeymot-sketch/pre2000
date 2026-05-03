/**
 * Non-regression test for AuthContext GDPR purge list (P1.2)
 *
 * INVARIANT: every Firestore top-level collection that the client writes
 * MUST be present in `topLevelCollectionsToDelete` so that `deleteAccount`
 * removes it (RGPD Art. 17 — droit à l'effacement).
 *
 * This is a static source-level guard: if a future change drops a collection
 * from the array, this test fails *before* a real user is ever orphaned.
 */

import * as fs from 'fs';
import * as path from 'path';

const AUTH_CONTEXT_PATH = path.resolve(__dirname, '../AuthContext.tsx');

const REQUIRED_COLLECTIONS = [
    'glucoseMetrics',       // P1.2 — added
    'symptomsLog',          // P1.2 — added
    'healthMetrics',        // weight + BP entries
    'userTasks',            // custom tasks
    'userEvents',           // calendar events
    'userReminderSettings', // reminder prefs (legacy)
    'userTaskStatuses',     // completed reminders
    'weight_entries',       // weightService.ts dedicated collection
    'reminder_settings_v2', // remindersV2Service collection
] as const;

describe('AuthContext.deleteAccount — topLevelCollectionsToDelete (P1.2 GDPR guard)', () => {
    let source: string;
    let arrayBody: string;

    beforeAll(() => {
        source = fs.readFileSync(AUTH_CONTEXT_PATH, 'utf8');
        const m = source.match(/const\s+topLevelCollectionsToDelete\s*=\s*\[([\s\S]*?)\];/);
        if (!m) {
            throw new Error('topLevelCollectionsToDelete array not found in AuthContext.tsx');
        }
        arrayBody = m[1];
    });

    it('declares the topLevelCollectionsToDelete array', () => {
        expect(source).toMatch(/const\s+topLevelCollectionsToDelete\s*=\s*\[/);
    });

    it.each(REQUIRED_COLLECTIONS)(
        'must include "%s" in the GDPR purge list',
        (collectionName) => {
            const re = new RegExp(`['"\`]${collectionName}['"\`]`);
            expect(arrayBody).toMatch(re);
        }
    );

    it('iterates the list inside deleteAccount with a for-of loop', () => {
        expect(source).toMatch(/for\s*\(\s*const\s+\w+\s+of\s+topLevelCollectionsToDelete/);
    });

    it('queries each collection by user_id before deleting (data isolation)', () => {
        expect(source).toMatch(/where\(\s*['"`]user_id['"`]\s*,\s*['"`]==['"`]\s*,\s*uid\s*\)/);
    });
});
