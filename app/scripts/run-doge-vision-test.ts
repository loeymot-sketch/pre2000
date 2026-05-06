/**
 * Script pour exécuter le test Doge Vision
 * 
 * Ce script vérifie la présence des variables d'environnement nécessaires
 * puis exécute le test pour Doge Vision.
 */

import { execSync } from 'child_process';

console.log('======================================================');
console.log('🔍 TEST DOGE VISION - 20 COMPTES & 20 COMMENTAIRES');
console.log('======================================================');

// Vérifier les variables d'environnement
const requiredVars = [
  'BRIGHT_DATA_API_KEY',
  'BRIGHT_DATA_USERNAME',
  'BRIGHT_DATA_PASSWORD',
  'OPENAI_API_KEY'
];

const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:');
  missing.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nCes variables sont nécessaires pour exécuter le test Doge Vision.');
  process.exit(1);
}

// Exécuter le test
console.log('\n🚀 Exécution du test Doge Vision...\n');

try {
  execSync('tsx doge-vision-test.ts', { 
    stdio: 'inherit'
  });
  
  console.log('======================================================');
  console.log('✅ TEST TERMINÉ AVEC SUCCÈS');
  console.log('======================================================');
  console.log('Consultez le fichier doge-vision-test-log.txt pour les détails');
  console.log('Les résultats sont disponibles dans le dossier temp/doge-vision-test');
  console.log('======================================================');
} catch (error) {
  console.error('======================================================');
  console.error('❌ ERREUR LORS DU TEST');
  console.error('======================================================');
  console.error('Erreur:', error);
  console.error('======================================================');
  process.exit(1);
}