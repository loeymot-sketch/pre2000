/**
 * Script pour appliquer la migration qui ajoute les colonnes de test de proxies
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Obtenir le chemin du répertoire courant avec ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('Démarrage de la migration pour ajouter les colonnes de test aux proxies...');
    
    // Lire le contenu du fichier de migration
    const migrationPath = path.join(__dirname, 'migrations', '0015_add_lasttest_columns_to_proxies.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Exécuter la migration
    await db.execute(sql.raw(migrationContent));
    
    console.log('Migration appliquée avec succès !');
    
    // Vérifier que les colonnes ont bien été ajoutées
    const result = await db.execute(sql`
      SELECT 
        column_name 
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'proxies' AND 
        column_name IN ('lastTested', 'lastTestSuccess', 'lastTestIp', 'lastTestLatency', 'lastTestError')
    `);
    
    console.log('Colonnes vérifiées:', result.rows);
    console.log(`Total de ${result.rows.length} colonnes de test trouvées`);
    
  } catch (error) {
    console.error('Erreur lors de l\'application de la migration:', error);
  } finally {
    process.exit(0);
  }
}

applyMigration();