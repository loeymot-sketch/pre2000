/**
 * Script pour mettre à jour le format des identifiants des proxies BrightData
 * 
 * Ce script met à jour tous les proxies dans la base de données avec le format
 * d'identifiant correct pour BrightData.
 */

import { db } from './server/db';
import { proxies } from './shared/schema';
import { eq } from 'drizzle-orm';

async function updateProxyFormat() {
  try {
    // Format correct pour BrightData
    const correctUsername = "brd-customer-hl_ab176a27-zone-residential_proxy1";
    const correctPassword = "y7z8a8l1xu7";
    
    console.log("Mise à jour des proxies avec le format correct d'identifiant BrightData...");
    
    // Récupérer tous les proxies
    const allProxies = await db.select().from(proxies);
    
    console.log(`Nombre de proxies à mettre à jour : ${allProxies.length}`);
    
    // Mettre à jour chaque proxy avec les identifiants corrects
    for (const proxy of allProxies) {
      await db.update(proxies)
        .set({
          username: correctUsername,
          password: correctPassword,
          status: "active",
          consecutive_failures: 0,
          last_status_change: new Date()
        })
        .where(eq(proxies.id, proxy.id));
      
      console.log(`Proxy ID ${proxy.id} (${proxy.country}) mis à jour avec le format correct`);
    }
    
    console.log("\nVérification d'un exemple de proxy après mise à jour :");
    const sampleProxy = await db.select().from(proxies).limit(1);
    if (sampleProxy.length > 0) {
      const proxy = sampleProxy[0];
      console.log(`ID: ${proxy.id}`);
      console.log(`Pays: ${proxy.country}`);
      console.log(`Username: ${proxy.username}`);
      console.log(`Password: ${proxy.password ? 'défini' : 'non défini'}`);
      console.log(`Statut: ${proxy.status}`);
    }
    
    console.log("\nMise à jour terminée avec succès !");
  } catch (error) {
    console.error("Erreur lors de la mise à jour des proxies:", error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction
updateProxyFormat();