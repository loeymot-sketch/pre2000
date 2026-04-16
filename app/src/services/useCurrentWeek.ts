/**
 * HOOK-MIGRATION: useCurrentWeek moved to src/hooks/useCurrentWeek.ts
 * This re-export maintains backward compatibility for any remaining imports
 * from the old services/ location. Gradually migrate imports to hooks/.
 * @deprecated Import from '../hooks/useCurrentWeek' instead.
 */
export { useCurrentWeek } from '../hooks/useCurrentWeek';
