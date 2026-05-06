/**
 * Script pour corriger les incompatibilités entre le schéma Drizzle et la structure réelle de la base de données
 * 
 * Ce script analyse les différences entre le schéma Drizzle et les tables existantes,
 * puis ajoute les colonnes manquantes si nécessaire.
 */

import * as pg from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('La variable d\'environnement DATABASE_URL n\'est pas définie.');
  process.exit(1);
}

async function fixSchemaMappings() {
  // Créer un client PostgreSQL
  const client = new pg.Client({
    connectionString: DATABASE_URL
  });
  
  try {
    // Se connecter à la base de données
    await client.connect();
    console.log('Connecté à la base de données PostgreSQL.');
    
    // Lister toutes les tables et leurs colonnes
    console.log('Analyse des tables et colonnes existantes...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Tables trouvées (${tables.length}): ${tables.join(', ')}`);
    
    // Vérifier les tables clés pour notre application
    const requiredTables = ['businesses', 'posting_accounts', 'proxies', 'publication_jobs'];
    
    for (const tableName of requiredTables) {
      if (!tables.includes(tableName)) {
        console.error(`ERREUR: La table '${tableName}' est manquante dans la base de données!`);
        continue;
      }
      
      console.log(`\nVérification des colonnes pour la table '${tableName}'...`);
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      
      const columns = columnsResult.rows.map(row => row.column_name);
      console.log(`Colonnes existantes (${columns.length}): ${columns.join(', ')}`);
      
      // Vérifier les colonnes critiques spécifiques à chaque table
      await verifyAndFixTableColumns(client, tableName, columns);
    }
    
    console.log('\nVérification des clés étrangères...');
    await verifyAndFixForeignKeys(client);
    
    console.log('\nAnalyse terminée avec succès.');
    
  } catch (error) {
    console.error('Erreur lors de la vérification du schéma:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion
    await client.end();
  }
}

async function verifyAndFixTableColumns(client: pg.Client, tableName: string, existingColumns: string[]) {
  // Définir les colonnes critiques par table
  const criticalColumns: Record<string, {name: string, type: string, defaultValue?: string}[]> = {
    'businesses': [
      { name: 'platformIds', type: 'JSONB', defaultValue: '{}' },
      { name: 'status', type: 'TEXT', defaultValue: "'active'" },
      { name: 'metadata', type: 'JSONB', defaultValue: '{}' }
    ],
    'posting_accounts': [
      { name: 'username', type: 'TEXT', defaultValue: null },
      { name: 'lastTested', type: 'TIMESTAMP', defaultValue: null },
      { name: 'successRate', type: 'NUMERIC(5,2)', defaultValue: '100.0' },
      { name: 'consecutiveFailures', type: 'INTEGER', defaultValue: '0' },
      { name: 'consecutiveSuccesses', type: 'INTEGER', defaultValue: '0' },
      { name: 'lastFailure', type: 'TIMESTAMP', defaultValue: null },
      { name: 'lastSuccess', type: 'TIMESTAMP', defaultValue: null },
      { name: 'metadata', type: 'JSONB', defaultValue: '{}' }
    ],
    'proxies': [
      { name: 'url', type: 'TEXT', defaultValue: null },
      { name: 'type', type: 'TEXT', defaultValue: "'residential'" },
      { name: 'lastTested', type: 'TIMESTAMP', defaultValue: null },
      { name: 'lastSuccess', type: 'TIMESTAMP', defaultValue: null },
      { name: 'lastFailure', type: 'TIMESTAMP', defaultValue: null },
      { name: 'platforms', type: 'TEXT[]', defaultValue: '{}' },
      { name: 'metadata', type: 'JSONB', defaultValue: '{}' }
    ],
    'publication_jobs': [
      { name: 'businessId', type: 'INTEGER', defaultValue: null },
      { name: 'reviewCount', type: 'INTEGER', defaultValue: '0' },
      { name: 'platforms', type: 'TEXT[]', defaultValue: '{}' },
      { name: 'distributionShape', type: 'TEXT', defaultValue: "'natural'" },
      { name: 'metadata', type: 'JSONB', defaultValue: '{}' }
    ]
  };
  
  // Traiter la table avec les colonnes critiques correspondantes
  if (criticalColumns[tableName]) {
    for (const column of criticalColumns[tableName]) {
      const hasColumn = existingColumns.includes(column.name);
      
      // Vérifier si le nom camelCase existe ou s'il existe un équivalent avec underscore
      const underscoreName = camelToUnderscore(column.name);
      const hasUnderscoreColumn = existingColumns.includes(underscoreName);
      
      if (!hasColumn && !hasUnderscoreColumn) {
        console.log(`  Ajout de la colonne '${column.name}' à la table '${tableName}'...`);
        
        try {
          const defaultClause = column.defaultValue ? `DEFAULT ${column.defaultValue}` : '';
          await client.query(`
            ALTER TABLE "${tableName}" 
            ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type} ${defaultClause};
          `);
          console.log(`  ✅ Colonne '${column.name}' ajoutée avec succès.`);
        } catch (error) {
          console.error(`  ❌ Erreur lors de l'ajout de la colonne '${column.name}':`, error);
        }
      } else if (hasUnderscoreColumn && !hasColumn) {
        // Créer un alias ou une colonne virtuelle si possible
        console.log(`  Note: La colonne '${underscoreName}' existe déjà dans la table (format snake_case).`);
      }
    }
  } else {
    console.log(`  Aucune colonne critique définie pour la table '${tableName}'.`);
  }
}

async function verifyAndFixForeignKeys(client: pg.Client) {
  // Vérifier les clés étrangères critiques
  const criticalForeignKeys = [
    { 
      table: 'publication_jobs', 
      column: 'businessId', 
      references: { table: 'businesses', column: 'id' },
      alternateColumn: 'business_id'
    },
    { 
      table: 'posting_accounts', 
      column: 'proxyId', 
      references: { table: 'proxies', column: 'id' },
      alternateColumn: 'proxy_id'
    }
  ];
  
  for (const fk of criticalForeignKeys) {
    console.log(`  Vérification de la clé étrangère ${fk.table}.${fk.column} -> ${fk.references.table}.${fk.references.column}...`);
    
    // Vérifier si la colonne existe (en camelCase ou snake_case)
    const columnResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      AND (column_name = $2 OR column_name = $3);
    `, [fk.table, fk.column, fk.alternateColumn]);
    
    if (columnResult.rows.length === 0) {
      console.error(`  ❌ La colonne '${fk.column}' ou '${fk.alternateColumn}' n'existe pas dans la table '${fk.table}'.`);
      continue;
    }
    
    const actualColumnName = columnResult.rows[0].column_name;
    
    // Vérifier si la contrainte existe déjà
    const constraintName = `${fk.table}_${actualColumnName}_fkey`;
    const constraintExists = await checkConstraintExists(client, constraintName);
    
    if (!constraintExists) {
      try {
        await client.query(`
          ALTER TABLE "${fk.table}" 
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("${actualColumnName}") 
          REFERENCES "${fk.references.table}" ("${fk.references.column}")
          ON DELETE SET NULL;
        `);
        console.log(`  ✅ Contrainte '${constraintName}' ajoutée avec succès.`);
      } catch (error) {
        console.error(`  ❌ Erreur lors de l'ajout de la contrainte:`, error);
      }
    } else {
      console.log(`  ℹ️ La contrainte '${constraintName}' existe déjà.`);
    }
  }
}

async function checkConstraintExists(client: pg.Client, constraintName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT 1
    FROM pg_constraint
    WHERE conname = $1;
  `, [constraintName]);
  
  return result.rowCount > 0;
}

// Fonction utilitaire pour convertir camelCase en snake_case
function camelToUnderscore(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Exécuter la fonction principale
fixSchemaMappings().catch(console.error);