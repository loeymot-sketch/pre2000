import { closeDatabase } from './server/db';
import { storage } from './server/storage';
import { proxyService } from './server/services/proxy.service';
import { logger } from './server/services/logger.service';

async function initializeTestProxy() {
  console.log("=== Initialisation d'un proxy de test ===");
  
  try {
    // Vérifier les proxies existants
    const existingProxies = await storage.getProxies();
    console.log(`Nombre de proxies existants: ${existingProxies.length}`);
    
    if (existingProxies.length > 0) {
      console.log("Des proxies existent déjà dans la base de données:");
      for (const proxy of existingProxies) {
        console.log(`ID: ${proxy.id}, Hôte: ${proxy.host}, Port: ${proxy.port}, Pays: ${proxy.country}, Statut: ${proxy.status}`);
      }
    } else {
      // Créer un proxy de test avec les identifiants BrightData
      const newProxy = await storage.createProxy({
        host: 'brd.superproxy.io',
        port: 33335,
        username: 'brd-customer-hl_edaab6a2-zone-residential_proxy1',
        password: 'rbzes9r4sh8c',
        type: 'residential',
        country: 'FR',
        status: 'active',
        options: { zone: 'residential_proxy1' }
      });
      
      console.log("Proxy de test créé avec succès:");
      console.log(`ID: ${newProxy.id}, Hôte: ${newProxy.host}, Port: ${newProxy.port}, Pays: ${newProxy.country}`);
      
      // Pour éviter un timeout, on ne teste pas le proxy ici
      console.log("\nProxy créé sans test (pour éviter le timeout).");
      
      // La variable testResult n'existe plus
      console.log("Aucun test exécuté pour le moment");
    }
    
    // Fermer proprement la connexion
    await closeDatabase();
    console.log("\nInitialisation terminée.");
    
  } catch (error) {
    console.error("ERREUR:", error);
    await closeDatabase();
  }
}

// Exécuter l'initialisation
initializeTestProxy();