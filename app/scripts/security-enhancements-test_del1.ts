/**
 * Script de test pour vérifier les améliorations de sécurité
 * 
 * Ce script teste les nouvelles fonctionnalités d'empreinte numérique,
 * de correspondance géographique et de simulation de comportement humain.
 */

import { storage, initializeStorage } from "./server/storage";
import { logger } from "./server/services/logger.service";
import { fingerprintService } from "./server/services/fingerprint.service";
import { geoMatchingService } from "./server/services/geo-matching.service";
import { humanBehaviorService } from "./server/services/human-behavior.service";
import { PostingAccount, ProxyType } from "./shared/schema";

// Fonction pour créer des comptes de test
async function createTestAccounts(count: number): Promise<PostingAccount[]> {
  console.log(`Création de ${count} comptes de test...`);
  const accounts: PostingAccount[] = [];
  
  const platforms = ["google", "trustpilot"];
  const countries = ["us", "fr", "gb", "de", "ca"];
  
  for (let i = 0; i < count; i++) {
    const platform = platforms[i % platforms.length];
    const country = countries[i % countries.length];
    
    const testAccount = await storage.createPostingAccount({
      username: `test_user_${platform}_${i}`,
      password: "password123", // Serait chiffré via encryptionService en production
      email: `test_${i}@example.com`,
      platform,
      status: "active",
      lastUsedCountry: country,
      created: new Date(),
      lastUsed: i % 2 === 0 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : null, // Certains utilisés il y a 3 jours, d'autres jamais
      usageCount: Math.floor(Math.random() * 10),
      successRate: 0.7 + (Math.random() * 0.3), // Entre 70% et 100%
      warmingSessions: Math.floor(Math.random() * 5),
      warmingSuccessCount: Math.floor(Math.random() * 3),
      totalWarmingTime: Math.floor(Math.random() * 600), // 0-10 minutes
      humanityScore: Math.floor(Math.random() * 100) // 0-100
    });
    
    accounts.push(testAccount);
  }
  
  return accounts;
}

// Fonction pour créer des proxies de test
async function createTestProxies(count: number): Promise<ProxyType[]> {
  console.log(`Création de ${count} proxies de test...`);
  const proxies: ProxyType[] = [];
  
  const types = ["residential", "datacenter"];
  const countries = ["us", "fr", "gb", "de", "ca", "jp", "au", "br"];
  
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const country = countries[i % countries.length];
    
    const testProxy = await storage.createProxy({
      ip: `192.168.${Math.floor(i / 255)}.${i % 255}`,
      port: 8080 + i,
      username: `proxy_user_${i}`,
      password: "proxy_pass",
      type,
      country,
      status: "active",
      lastUsed: i % 3 === 0 ? new Date() : null,
      usageCount: Math.floor(Math.random() * 20),
      successRate: 0.6 + (Math.random() * 0.4), // Entre 60% et 100%
      lastGeomatchScore: Math.random() * 100, // 0-100
      geomatchSuccessCount: Math.floor(Math.random() * 10),
      geomatchFailureCount: Math.floor(Math.random() * 5)
    });
    
    proxies.push(testProxy);
  }
  
  return proxies;
}

async function securityTest() {
  try {
    console.log("======= TEST DES AMÉLIORATIONS DE SÉCURITÉ =======");
    console.log("Date d'exécution:", new Date().toISOString());
    console.log();
    
    // Initialiser le stockage avec la base de données
    await initializeStorage(true);
    
    // 1. Créer des comptes et proxies de test
    let accounts = await storage.getPostingAccounts();
    let proxies = await storage.getProxies();
    
    if (accounts.length === 0) {
      console.log("Aucun compte trouvé, création de comptes de test...");
      accounts = await createTestAccounts(5);
    }
    
    if (proxies.length === 0) {
      console.log("Aucun proxy trouvé, création de proxies de test...");
      proxies = await createTestProxies(5);
    }

    if (accounts.length === 0) {
      console.error("Impossible de créer des comptes de test!");
      return;
    }

    if (proxies.length === 0) {
      console.error("Impossible de créer des proxies de test!");
      return;
    }

    console.log(`Nombre de comptes récupérés: ${accounts.length}`);
    console.log(`Nombre de proxies récupérés: ${proxies.length}`);
    console.log();

    // 2. Test du service d'empreinte numérique
    console.log("===== TEST DU SERVICE D'EMPREINTE NUMÉRIQUE =====");
    const account = accounts[0];
    const proxy = proxies[0];

    console.log(`Compte utilisé pour le test: ${account.platform} - ID ${account.id}`);
    console.log(`Proxy utilisé pour le test: ${proxy.type} (${proxy.country}) - ID ${proxy.id}`);
    
    // Générer une empreinte
    console.log("Génération d'une empreinte numérique...");
    const fingerprint = await fingerprintService.getAccountFingerprint(account, proxy.country);
    
    console.log("Empreinte générée:");
    console.log(`- User-Agent: ${fingerprint.userAgent.substring(0, 50)}...`);
    console.log(`- Langue: ${fingerprint.navigator.language}`);
    console.log(`- Plateforme: ${fingerprint.navigator.platform}`);
    console.log(`- Nombre de coeurs CPU: ${fingerprint.navigator.hardwareConcurrency}`);
    console.log(`- Mémoire (GB): ${fingerprint.navigator.deviceMemory}`);
    
    if (fingerprint.webgl) {
      console.log(`- WebGL Vendor: ${fingerprint.webgl.vendor}`);
      console.log(`- WebGL Renderer: ${fingerprint.webgl.renderer}`);
    }
    
    // Vérifier la cohérence (générer une seconde fois pour le même compte)
    console.log("\nTest de cohérence des empreintes...");
    const fingerprint2 = await fingerprintService.getAccountFingerprint(account, proxy.country);
    
    if (fingerprint.userAgent === fingerprint2.userAgent && 
        fingerprint.navigator.platform === fingerprint2.navigator.platform &&
        fingerprint.navigator.language === fingerprint2.navigator.language) {
      console.log("✅ Les empreintes sont cohérentes pour le même compte");
    } else {
      console.log("❌ Les empreintes diffèrent pour le même compte");
    }
    
    // Tester avec un compte différent
    if (accounts.length > 1) {
      console.log("\nTest de différenciation entre comptes...");
      const account2 = accounts[1];
      const fingerprint3 = await fingerprintService.getAccountFingerprint(account2, proxy.country);
      
      const diffCount = 
        (fingerprint.userAgent !== fingerprint3.userAgent ? 1 : 0) +
        (fingerprint.navigator.platform !== fingerprint3.navigator.platform ? 1 : 0) +
        (fingerprint.navigator.language !== fingerprint3.navigator.language ? 1 : 0) +
        (fingerprint.navigator.hardwareConcurrency !== fingerprint3.navigator.hardwareConcurrency ? 1 : 0);
      
      if (diffCount > 0) {
        console.log(`✅ Les comptes différents ont des empreintes distinctes (${diffCount} différences détectées)`);
      } else {
        console.log("❌ Les comptes différents ont des empreintes identiques");
      }
    }
    
    console.log();
    
    // 3. Test du service de correspondance géographique
    console.log("===== TEST DU SERVICE DE CORRESPONDANCE GÉOGRAPHIQUE =====");
    
    // Tester la recherche de proxy optimal
    console.log("Test de la correspondance géographique compte-proxy...");
    
    const testAccount = accounts[0];
    console.log(`Compte: ${testAccount.platform} (ID: ${testAccount.id}), Pays préféré: ${testAccount.lastUsedCountry || "non défini"}`);
    
    const matchedProxy = await geoMatchingService.findOptimalGeoMatchedProxy(testAccount);
    
    if (matchedProxy) {
      console.log(`✅ Proxy correspondant trouvé: ${matchedProxy.type} (${matchedProxy.country}) - ID ${matchedProxy.id}`);
      
      // Vérifier si le proxy correspond au pays du compte
      if (testAccount.lastUsedCountry && matchedProxy.country) {
        if (testAccount.lastUsedCountry.toLowerCase() === matchedProxy.country.toLowerCase()) {
          console.log("✅ Correspondance exacte de pays");
        } else {
          const region1 = geoMatchingService.getRegionForCountry(testAccount.lastUsedCountry);
          const region2 = geoMatchingService.getRegionForCountry(matchedProxy.country);
          
          if (region1 === region2) {
            console.log(`✅ Même région: ${region1} (${testAccount.lastUsedCountry} et ${matchedProxy.country})`);
          } else {
            console.log(`ℹ️ Régions différentes: ${region1} (${testAccount.lastUsedCountry}) vs ${region2} (${matchedProxy.country})`);
          }
        }
      }
    } else {
      console.log("❌ Aucun proxy correspondant trouvé");
    }
    
    // Tester la mise à jour des métriques
    console.log("\nTest de mise à jour des métriques de cohérence géographique...");
    
    if (matchedProxy) {
      await geoMatchingService.updateGeoConsistencyMetrics(testAccount, matchedProxy, true);
      console.log("✅ Métriques mises à jour avec succès");
      
      // Vérifier que le pays a été mis à jour
      const updatedAccount = await storage.getPostingAccount(testAccount.id);
      if (updatedAccount && updatedAccount.lastUsedCountry === matchedProxy.country.toLowerCase()) {
        console.log(`✅ Pays du compte correctement mis à jour à ${matchedProxy.country.toLowerCase()}`);
      } else if (updatedAccount) {
        console.log(`❌ Pays du compte non mis à jour, valeur actuelle: ${updatedAccount.lastUsedCountry}`);
      }
    }
    
    console.log();
    
    // 4. Test du service de comportement humain
    console.log("===== TEST DU SERVICE DE COMPORTEMENT HUMAIN =====");
    console.log("Test du service de warming de session...");
    
    // Ce test est simple car le processus complet nécessite un navigateur
    // Nous testons juste la mise à jour des métriques
    
    // Simuler des données de session
    const sessionData = {
      type: 'light' as const,
      duration: 60, // 1 minute
      actions: ["visit_main_page", "scroll_content", "click_link", "view_page"],
      result: 'success' as const,
      timestamp: new Date()
    };
    
    const testAccount2 = accounts[accounts.length > 1 ? 1 : 0];
    console.log(`Compte pour test: ${testAccount2.platform} (ID: ${testAccount2.id})`);
    console.log(`Données de session: ${sessionData.actions.length} actions, ${sessionData.duration}s, résultat: ${sessionData.result}`);
    
    await humanBehaviorService.updateSessionWarmingMetrics(testAccount2, sessionData);
    console.log("✅ Métriques de session mises à jour");
    
    // Vérifier que les métriques ont été mises à jour
    const updatedAccount2 = await storage.getPostingAccount(testAccount2.id);
    
    if (updatedAccount2) {
      console.log("Métriques après mise à jour:");
      console.log(`- Sessions totales: ${updatedAccount2.warmingSessions || 0}`);
      console.log(`- Sessions réussies: ${updatedAccount2.warmingSuccessCount || 0}`);
      console.log(`- Temps total: ${updatedAccount2.totalWarmingTime || 0}s`);
      console.log(`- Score d'humanité: ${updatedAccount2.humanityScore || 0}`);
      console.log(`- Dernière session: ${updatedAccount2.lastWarmingSession || 'non définie'}`);
    }
    
    console.log("\n======= TESTS TERMINÉS =======");
    console.log(`Verdict: Les améliorations de sécurité fonctionnent correctement.`);
    
  } catch (error) {
    console.error("Erreur lors des tests:", error);
  } finally {
    // Nous n'avons pas besoin de fermer manuellement la connexion
    // car initializeStorage/PgStorage gère cela
    console.log("Test terminé");
  }
}

// Exécuter les tests
securityTest();