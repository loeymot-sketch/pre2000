/**
 * Script de correction du schéma de base de données
 * 
 * Ce script permet de corriger les problèmes de schéma de base de données
 * identifiés dans le système (colonnes manquantes, etc.)
 */

// Créer une version simple de SimpleLogger pour ce script
class SimpleLogger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  info(message: string) {
    console.log(`[INFO][${this.prefix}] ${message}`);
  }

  warn(message: string) {
    console.warn(`[WARN][${this.prefix}] ${message}`);
  }

  error(message: string) {
    console.error(`[ERROR][${this.prefix}] ${message}`);
  }
}

// Utiliser une connexion basique à la base de données
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const logger = new SimpleLogger('fix-database-schema');

async function fixDatabaseSchema() {
  try {
    logger.info('Démarrage de la correction du schéma de base de données...');

    // 1. Vérifier la connexion à la base de données
    try {
      await db.execute(sql`SELECT 1`);
      logger.info('Connexion à la base de données réussie.');
    } catch (error) {
      logger.error(`Erreur de connexion à la base de données: ${error.message}`);
      process.exit(1);
    }

    // 2. Exécuter la migration avec drizzle-kit
    logger.info('Exécution de la migration pour corriger le schéma...');
    
    // Vérifier si le fichier de migration existe
    const migrationPath = path.join(process.cwd(), 'drizzle', '0010_fix_missing_columns.sql');
    if (!fs.existsSync(migrationPath)) {
      logger.error('Fichier de migration non trouvé:', migrationPath);
      process.exit(1);
    }
    
    // Exécuter la commande npm run db:push
    exec('npm run db:push', (error, stdout, stderr) => {
      if (error) {
        logger.error(`Erreur lors de l'exécution de la migration: ${error.message}`);
        logger.error(stderr);
        process.exit(1);
      }
      
      logger.info('Sortie de la migration:');
      logger.info(stdout);
      
      // 3. Vérifier si les colonnes sont maintenant présentes
      verifyColumns();
    });
  } catch (error) {
    logger.error(`Erreur lors de la correction du schéma: ${error.message}`);
    process.exit(1);
  }
}

async function verifyColumns() {
  try {
    logger.info('Vérification des colonnes après migration...');
    
    // Vérifier la présence de la colonne "rating" dans la table "reviews"
    try {
      await db.execute(sql`SELECT rating FROM reviews LIMIT 1`);
      logger.info('✅ Colonne "rating" présente dans la table "reviews".');
    } catch (error) {
      logger.error(`❌ Colonne "rating" toujours absente dans la table "reviews": ${error.message}`);
    }
    
    // Vérifier la présence de la colonne "platform" dans la table "businesses"
    try {
      await db.execute(sql`SELECT platform FROM businesses LIMIT 1`);
      logger.info('✅ Colonne "platform" présente dans la table "businesses".');
    } catch (error) {
      logger.error(`❌ Colonne "platform" toujours absente dans la table "businesses": ${error.message}`);
    }
    
    // Vérifier la présence de la colonne "last_status_change" dans la table "proxies"
    try {
      await db.execute(sql`SELECT last_status_change FROM proxies LIMIT 1`);
      logger.info('✅ Colonne "last_status_change" présente dans la table "proxies".');
    } catch (error) {
      logger.error(`❌ Colonne "last_status_change" toujours absente dans la table "proxies": ${error.message}`);
    }
    
    logger.info('Vérification du schéma terminée.');
    
    // Redémarrer le serveur pour prendre en compte les changements
    logger.info('Correction du schéma terminée. Veuillez redémarrer le serveur pour prendre en compte les changements.');
  } catch (error) {
    logger.error(`Erreur lors de la vérification des colonnes: ${error.message}`);
  }
}

// Exécuter le script si lancé directement
if (require.main === module) {
  fixDatabaseSchema();
}

export { fixDatabaseSchema };