/**
 * Script pour appliquer la migration 0022_fix_missing_proxy_columns.sql
 * 
 * Ce script ajoute les colonnes manquantes dans la table des proxies et corrige les
 * incohérences de nommage (snake_case vs camelCase)
 */

import { execSync } from 'child_process';
import { db } from './server/db';
import fs from 'fs';
import path from 'path';
import { loggerAdapter } from './server/adapters/logger.adapter';

const logger = loggerAdapter;

async function applyMigration() {
  try {
    logger.info('Début de l\'application de la migration pour corriger les colonnes manquantes...');
    
    // Lire le contenu du fichier de migration
    const migrationPath = path.join(process.cwd(), 'migrations', '0022_fix_missing_proxy_columns.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Exécuter le script SQL
    await db.execute(migrationContent);
    
    logger.info('Migration appliquée avec succès!');
    
    // Vérifier que les colonnes ont été correctement ajoutées
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'proxies'
      AND column_name IN ('lastPlatform', 'usageTimeToday', 'lastFailureReason', 'specializedFor')
    `;
    
    const columnsAdded = await db.execute(checkQuery);
    
    logger.info(`Colonnes vérifiées: ${columnsAdded.rows.map((row: any) => row.column_name).join(', ')}`);
    
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'application de la migration:', error);
    return false;
  }
}

async function main() {
  try {
    console.log('Application de la migration pour corriger les colonnes manquantes...');
    
    const result = await applyMigration();
    
    if (result) {
      console.log('Migration appliquée avec succès!');
    } else {
      console.error('Erreur lors de l\'application de la migration.');
      process.exit(1);
    }
    
    // Fermer la connexion à la base de données
    await db.end();
    
    console.log('Fait!');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
main();