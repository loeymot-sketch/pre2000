/**
 * Script de test pour la fonctionnalité de rotation des comptes
 * 
 * Ce script exécute la migration de base de données pour ajouter les nouveaux champs
 * puis lance les tests de rotation des comptes
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { runAccountRotationTests } from './server/tests/account-rotation.test';

async function main() {
  console.log('Initialisation du test de rotation des comptes...');
  
  try {
    // Exécuter la migration 0003
    console.log('Application de la migration pour les champs de rotation des comptes...');
    const migrationPath = path.join(__dirname, 'migrations', '0003_add_account_rotation_fields.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Exécuter la migration
    await db.execute(sql.raw(migrationSql));
    console.log('Migration appliquée avec succès.');
    
    // Exécuter les tests
    console.log('\nLancement des tests de rotation des comptes...');
    await runAccountRotationTests();
    
    console.log('\nTests terminés.');
  } catch (error) {
    console.error('Erreur lors du test de rotation des comptes:', error);
    process.exit(1);
  }
}

main();