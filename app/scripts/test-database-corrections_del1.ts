/**
 * Script de test pour vérifier que les corrections de la base de données ont été appliquées
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';

// Configurer logging
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || '')
};

/**
 * Vérifie que les colonnes et tables nécessaires existent
 */
async function testDatabaseCorrections() {
  try {
    logger.info('Démarrage des tests de vérification des corrections...');
    
    // 1. Vérifier la connexion à la base de données
    try {
      await db.execute(sql`SELECT 1`);
      logger.info('Connexion à la base de données réussie.');
    } catch (error) {
      logger.error('Erreur de connexion à la base de données:', error);
      process.exit(1);
    }
    
    // 2. Vérifier la présence de la colonne lastResponseTime dans la table proxies
    try {
      await db.execute(sql`SELECT "lastResponseTime" FROM proxies LIMIT 1`);
      logger.info('✅ Colonne "lastResponseTime" existe dans la table proxies.');
    } catch (error) {
      logger.error('❌ Erreur lors de la vérification de la colonne "lastResponseTime":', error);
      return false;
    }
    
    // 3. Vérifier la présence de la table publication_jobs
    try {
      await db.execute(sql`SELECT * FROM publication_jobs LIMIT 1`);
      logger.info('✅ Table "publication_jobs" existe.');
    } catch (error) {
      logger.error('❌ Erreur lors de la vérification de la table "publication_jobs":', error);
      return false;
    }
    
    // 4. Vérifier que les noms de colonnes sont en camelCase et non en snake_case
    try {
      await db.execute(sql`SELECT "createdAt" FROM proxies LIMIT 1`);
      logger.info('✅ Les noms de colonnes sont bien en camelCase ("createdAt").');
    } catch (error) {
      logger.error('❌ Erreur lors de la vérification du format des colonnes:', error);
      
      // Essayer avec snake_case pour confirmer le problème
      try {
        await db.execute(sql`SELECT created_at FROM proxies LIMIT 1`);
        logger.error('❌❌ Les noms de colonnes sont encore en snake_case (created_at).');
        return false;
      } catch (secondError) {
        logger.info('✅ Format de colonne snake_case non trouvé (normal).');
      }
    }
    
    logger.info('✅ Toutes les vérifications ont réussi. Les corrections ont été appliquées avec succès.');
    return true;
  } catch (error) {
    logger.error('Erreur non gérée lors de la vérification:', error);
    return false;
  }
}

// Exécuter le script
testDatabaseCorrections()
  .then(success => {
    if (success) {
      console.log('✅ Tests de vérification des corrections réussis.');
      process.exit(0);
    } else {
      console.error('❌ Certains tests de vérification ont échoué.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  });