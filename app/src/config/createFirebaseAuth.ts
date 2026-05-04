/**
 * Metro resolves `createFirebaseAuth.web` / `createFirebaseAuth.native` at bundle time.
 * This barrel exists so TypeScript can resolve `./createFirebaseAuth`.
 */
export { createFirebaseAuth } from './createFirebaseAuth.native';
