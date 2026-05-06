/**
 * Script pour mettre à jour les proxies BrightData pour l'accès à Google
 * 
 * Ce script ajoute les options spécifiques nécessaires pour accéder à Google
 * via les proxies résidentiels BrightData, notamment la configuration KYC requise.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function updateBrightDataGoogleAccess() {
  try {
    console.log("Mise à jour des proxies BrightData pour l'accès à Google...");
    
    // Récupérer tous les proxies
    const allProxies = await db.select().from(schema.proxies);
    
    console.log(`Nombre de proxies à mettre à jour : ${allProxies.length}`);
    
    // Pour chaque proxy, mettre à jour les options
    for (const proxy of allProxies) {
      // Récupérer les options actuelles
      let options = proxy.options || {};
      
      // Configuration pour Google avec une session persistante
      // Ces paramètres sont requis pour les sites nécessitant KYC
      const updatedOptions = {
        ...options,
        session: `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        persistent_session: true,  // Maintenir la même IP pour cette session
        disable_immediate_mode: true, // Désactiver le mode immédiat qui est bloqué
        disable_connection_reuse: false, // Réutiliser les connexions
      };
      
      // Mettre à jour le proxy avec les nouvelles options
      await db.update(schema.proxies)
        .set({
          options: updatedOptions,
          status: "active", 
          consecutive_failures: 0,
          total_failures: 0,
          total_successes: 0,
          last_status_change: new Date()
        })
        .where(eq(schema.proxies.id, proxy.id));
      
      console.log(`✅ Proxy ID ${proxy.id} (${proxy.country}) mis à jour avec les options KYC`);
    }
    
    console.log("\nVérification d'un exemple de proxy après mise à jour :");
    const sampleProxy = await db.select().from(schema.proxies).limit(1);
    if (sampleProxy.length > 0) {
      const proxy = sampleProxy[0];
      console.log(`ID: ${proxy.id}`);
      console.log(`Pays: ${proxy.country}`);
      console.log(`Options: ${JSON.stringify(proxy.options, null, 2)}`);
    }
    
    console.log("\n✅ Tous les proxies ont été mis à jour avec succès!");
    console.log("Vous pouvez maintenant relancer les tests d'accès à Google.");
    
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour des proxies:", error);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Exécuter la fonction
updateBrightDataGoogleAccess()
  .then(() => console.log("Script terminé."))
  .catch(console.error);