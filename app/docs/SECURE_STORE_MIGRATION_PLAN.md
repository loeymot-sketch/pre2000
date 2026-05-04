# Migration AsyncStorage → expo-secure-store (différée)

## Status
**DÉFÉRÉE** au cycle R1-arch.2 (post-UserMode enum) ou cycle dédié post-v1.0.

## Données concernées (PII sensibles, miroir local AsyncStorage)
- `userProfile.emergencyContacts[].number` (numéros tel des proches)
- `userProfile.ovulationDate` (santé reproductive)
- `userProfile.fertileWindowStart` / `fertileWindowEnd`
- `userProfile.email` (déjà géré par Firebase Auth, miroir local optionnel)

## Mitigation appliquée v1.0
- `android.allowBackup: false` — empêche backup Google Drive automatique du cache AsyncStorage
- iOS: pas de backup via défaut (excluded from iCloud par défaut pour app data)
- Auth: tous les writes Firestore protégés par App Check (cycle C6c)
- Disk encryption: iOS + Android moderns sont chiffrés au repos par défaut

## Plan migration
1. Créer `app/src/services/secureStorage.ts` wrappant expo-secure-store avec fallback AsyncStorage pour compat backward
2. Refactorer `PregnancyContext.profile` pour persister les champs PII via secureStorage
3. Migration one-shot au démarrage : si data trouvée dans AsyncStorage et pas dans secure-store → migrer puis supprimer
4. Tests intégration (mocks SecureStore + AsyncStorage)
5. Vérifier RGPD: la suppression compte (deleteAccount) doit aussi clean secure-store

## Risques migration
- Perte de données si migration buggy (mitigé par fallback read AsyncStorage tant que migration pas confirmée)
- Performance: secure-store est ~5x plus lent que AsyncStorage (~5ms vs ~1ms par read) → batcher les reads au mount
