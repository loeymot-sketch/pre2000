// Script pour lancer le test du service de nettoyage
import { runCleanupTests } from './server/tests/cleanup.test';
import { initializeDatabase } from './server/db';

async function main() {
  console.log('Initialisation du test du service de nettoyage...');
  
  try {
    // Initialiser la base de données (nécessaire pour le logger)
    await initializeDatabase();
    
    // Exécuter les tests
    console.log('\nLancement des tests du service de nettoyage...');
    await runCleanupTests();
    
    console.log('\nTests terminés avec succès.');
  } catch (error) {
    console.error('\nErreur lors des tests du service de nettoyage:', error);
    process.exit(1);
  }
}

main();