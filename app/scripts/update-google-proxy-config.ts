/**
 * Script pour optimiser les proxies BrightData pour l'accès à Google
 * 
 * Ce script améliore la configuration des proxies existants avec des
 * paramètres optimisés pour l'accès à Google, incluant:
 * - Session sticky (maintien de la même IP pour toute une session)
 * - Options KYC pour éviter les captchas
 * - Options de pays spécifiques pour les sites Google
 */

import { storage } from './server/storage';
import { initializeDatabase, closeDatabase } from './server/db';
import { initializeStorage } from './server/storage';
import { logger } from './server/services/logger.service';

// Les variables d'environnement sont déjà chargées par le système

// Paramètres optimisés pour les proxies BrightData accédant à Google
const GOOGLE_PROXY_PARAMS = {
  // Paramètres de session pour maintenir la même IP
  session_sticky: true,
  session_duration: 60, // 60 minutes
  
  // Options KYC pour réduire les captchas
  kyc_mode: 'high',
  google_kyc: true,
  
  // Options de rotation pour Google
  google_optimize: true,
  google_access: true,
  
  // Type de proxy optimisé pour Google
  proxy_type: 'residential'
};

// Options BrightData par pays pour Google
const COUNTRY_SPECIFIC_OPTIONS: Record<string, Record<string, any>> = {
  'US': {
    state: 'NY,CA,TX,IL,FL', // États principaux
    city: 'new-york,los-angeles,chicago,houston,miami', // Grandes villes
    asn: '7922,6327,20115,22394', // ASNs populaires aux US (Comcast, AT&T, etc.)
    google_specific: true
  },
  'UK': {
    city: 'london,manchester,birmingham,glasgow,liverpool',
    asn: '2856,5089,3213,12576', // ASNs populaires au UK (BT, Virgin, etc.)
    google_specific: true
  },
  'FR': {
    city: 'paris,marseille,lyon,toulouse,nice',
    asn: '3215,12322,5410,21502', // ASNs populaires en France (Orange, Free, etc.)
    google_specific: true
  },
  'DE': {
    city: 'berlin,hamburg,munich,cologne,frankfurt',
    asn: '3320,8422,8767,6805', // ASNs populaires en Allemagne (Deutsche Telekom, etc.)
    google_specific: true
  },
  'CA': {
    city: 'toronto,montreal,vancouver,calgary,ottawa',
    asn: '577,6327,5769,812', // ASNs populaires au Canada (Bell, Rogers, etc.)
    google_specific: true
  }
};

async function updateGoogleProxyConfiguration() {
  console.log("🌐 Mise à jour de la configuration des proxies pour Google...");
  
  try {
    await initializeDatabase();
    await initializeStorage(true);
    console.log("✅ Base de données et stockage initialisés");
    
    // Récupérer tous les proxies
    const proxies = await storage.getProxies();
    console.log(`📊 ${proxies.length} proxies trouvés dans la base de données`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Mettre à jour chaque proxy avec les paramètres Google optimisés
    for (const proxy of proxies) {
      try {
        // Options de base pour tous les proxies
        const updates: any = {
          session_id: `google_session_${proxy.id}_${Date.now()}`,
          zone: 'residential',
          ...GOOGLE_PROXY_PARAMS
        };
        
        // Ajouter des options spécifiques au pays
        if (proxy.country && COUNTRY_SPECIFIC_OPTIONS[proxy.country]) {
          Object.assign(updates, COUNTRY_SPECIFIC_OPTIONS[proxy.country]);
        }
        
        // Mettre à jour le proxy dans la base de données
        await storage.updateProxy(proxy.id, updates);
        
        // Enregistrer la mise à jour dans les logs
        await logger.log("google_proxy_optimized", {
          proxyId: proxy.id,
          host: proxy.host,
          country: proxy.country,
          options: JSON.stringify(updates)
        });
        
        updatedCount++;
        console.log(`✅ Proxy ${proxy.id} (${proxy.host} - ${proxy.country || 'pays inconnu'}) optimisé pour Google`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur lors de la mise à jour du proxy ${proxy.id}:`, error);
      }
    }
    
    console.log("\n📝 Résumé de la mise à jour:");
    console.log(`- Total de proxies: ${proxies.length}`);
    console.log(`- Proxies mis à jour: ${updatedCount}`);
    console.log(`- Erreurs: ${errorCount}`);
    
    if (updatedCount > 0) {
      console.log("\n✅ Les proxies ont été optimisés pour l'accès à Google avec succès!");
      console.log("Les modifications devraient améliorer les points suivants:");
      console.log("- Réduction des captchas et challenges de sécurité");
      console.log("- Meilleure persistance des sessions avec la même IP");
      console.log("- Optimisation par pays pour éviter les détections géographiques");
      console.log("- Amélioration de la stabilité pour l'accès aux propriétés Google");
    } else {
      console.log("\n⚠️ Aucun proxy n'a été mis à jour. Vérifiez la configuration de la base de données.");
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour des proxies:", error);
  } finally {
    try {
      await closeDatabase();
    } catch (error) {
      // Ignorer l'erreur de fermeture
    }
  }
}

// Fonction principale
async function main() {
  try {
    console.log("🔍 Vérification des variables d'environnement BrightData...");
    
    const brightDataUsername = process.env.BRIGHT_DATA_USERNAME;
    const brightDataPassword = process.env.BRIGHT_DATA_PASSWORD;
    
    if (!brightDataUsername || !brightDataPassword) {
      console.error("❌ Variables d'environnement BrightData manquantes.");
      console.log("Veuillez définir BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD.");
      return;
    }
    
    console.log("✅ Variables d'environnement BrightData trouvées.");
    await updateGoogleProxyConfiguration();
    
  } catch (error) {
    console.error("Erreur générale:", error);
  }
}

// Exécuter le script
main().catch(console.error);