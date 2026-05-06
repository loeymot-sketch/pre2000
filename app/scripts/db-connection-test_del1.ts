/**
 * Script de test pour diagnostiquer la connexion à la base de données
 * et les problèmes de récupération des proxies
 */

import { db } from './server/db';
import { proxies } from './shared/schema';
import { storage, initializeStorage } from './server/storage';

async function testDatabaseConnection() {
  console.log("Test de connexion à la base de données...");
  
  try {
    // Test direct avec Drizzle ORM
    console.log("\n=== Test direct avec Drizzle ORM ===");
    const allProxies = await db.select().from(proxies);
    console.log(`Nombre de proxies trouvés directement avec Drizzle: ${allProxies.length}`);
    
    if (allProxies.length > 0) {
      console.log("Premier proxy:", allProxies[0]);
    } else {
      console.log("Aucun proxy trouvé directement avec Drizzle.");
    }
    
    // Test via l'interface de stockage
    console.log("\n=== Test via l'interface de stockage ===");
    const storageProxies = await storage.getProxies();
    console.log(`Nombre de proxies trouvés via l'interface de stockage: ${storageProxies.length}`);
    
    if (storageProxies.length > 0) {
      console.log("Premier proxy:", storageProxies[0]);
    } else {
      console.log("Aucun proxy trouvé via l'interface de stockage.");
    }
    
    // Si on a des résultats différents, on réinitialise l'interface de stockage
    if (allProxies.length !== storageProxies.length) {
      console.log("\n=== Réinitialisation de l'interface de stockage ===");
      await initializeStorage(true, true); // Forcer la réinitialisation
      
      const newStorageProxies = await storage.getProxies();
      console.log(`Nombre de proxies après réinitialisation: ${newStorageProxies.length}`);
    }
    
    // Vérifier la structure de la table proxies
    console.log("\n=== Structure de la table proxies ===");
    const tableInfo = await db.execute(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'proxies'`
    );
    console.log("Structure de la table proxies:", tableInfo.rows);
    
    // Vérifier les contraintes de clé primaire
    const primaryKeyInfo = await db.execute(
      `SELECT c.column_name
       FROM information_schema.table_constraints tc 
       JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
       JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
         AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
       WHERE constraint_type = 'PRIMARY KEY' AND tc.table_name = 'proxies'`
    );
    console.log("Clé primaire de la table proxies:", primaryKeyInfo.rows);
    
  } catch (error) {
    console.error("Erreur lors du test de connexion à la base de données:", error);
  }
}

testDatabaseConnection().catch(console.error);