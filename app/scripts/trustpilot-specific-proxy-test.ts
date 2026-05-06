/**
 * Test d'authentification avec Trustpilot via les proxies BrightData
 * 
 * Ce script teste spécifiquement l'authentification avec Trustpilot
 * en utilisant des options de configuration optimisées pour cette plateforme.
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { initializeDatabase, closeDatabase, db } from './server/db';
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Configuration BrightData
const BRIGHTDATA_USERNAME = process.env.BRIGHT_DATA_USERNAME;
const BRIGHTDATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD;

// Assurez-vous que les identifiants sont définis
if (!BRIGHTDATA_USERNAME || !BRIGHTDATA_PASSWORD) {
  console.error("❌ Les variables d'environnement BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD sont requises");
  process.exit(1);
}

/**
 * Teste une connexion directe à Trustpilot via un proxy BrightData
 */
async function testTrustpilotDirectConnection(): Promise<void> {
  console.log("🚀 TEST DE CONNEXION TRUSTPILOT VIA BRIGHTDATA\n");

  try {
    // 1. Configuration du proxy BrightData optimisée pour Trustpilot
    const proxyHost = 'brd.superproxy.io';
    const proxyPort = 22225; // Port différent pour les tests directs
    
    // Options spécifiques pour Trustpilot
    const trustpilotOptions = [
      'session_sticky',
      'session-lifetime=60',
      'country-us',
      'ssl',
      'keep_headers',
      'trustpilot_specific',
      'rotate_user_agent',
      'allow_domains-trustpilot.com,business.trustpilot.com,consumer-auth.trustpilot.com',
      'whitelist_domains-trustpilot.com,business.trustpilot.com,consumer-auth.trustpilot.com'
    ].join(',');
    
    // Nom d'utilisateur optimisé pour Trustpilot
    const optimizedUsername = `${BRIGHTDATA_USERNAME}-${trustpilotOptions}`;
    
    console.log("⏳ Configuration du proxy BrightData pour Trustpilot...");
    console.log(`   - Hôte: ${proxyHost}`);
    console.log(`   - Port: ${proxyPort}`);
    console.log(`   - Options: ${trustpilotOptions}`);
    
    // 2. Création de l'agent proxy
    const proxyUrl = `http://${optimizedUsername}:${BRIGHTDATA_PASSWORD}@${proxyHost}:${proxyPort}`;
    const httpsAgent = new HttpsProxyAgent(proxyUrl);
    
    console.log("\n⏳ Tentative de connexion à Trustpilot...");
    
    // 3. Test de connexion à Trustpilot
    const response = await axios.get('https://www.trustpilot.com', {
      httpsAgent,
      timeout: 30000, // 30 secondes de timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`✅ Connexion réussie à Trustpilot (status: ${response.status})`);
    console.log(`   - Taille de la réponse: ${response.data.length} caractères`);
    
    // Vérifier si la réponse contient bien du contenu Trustpilot
    if (response.data.includes('Trustpilot')) {
      console.log("✅ Contenu Trustpilot détecté dans la réponse");
    } else {
      console.log("⚠️ Contenu Trustpilot non détecté dans la réponse");
    }
    
  } catch (error) {
    console.error("❌ Erreur lors du test de connexion:", error.message);
    
    if (error.response) {
      console.error(`   - Status: ${error.response.status}`);
      console.error(`   - Headers:`, error.response.headers);
    } else if (error.request) {
      console.error("   - Aucune réponse reçue");
    }
  }
}

/**
 * Met à jour et test un proxy existant pour Trustpilot
 */
async function updateAndTestExistingProxy(): Promise<void> {
  console.log("\n🚀 MISE À JOUR ET TEST D'UN PROXY EXISTANT POUR TRUSTPILOT\n");
  
  try {
    // Initialiser la base de données
    console.log("⏳ Initialisation de la base de données...");
    await initializeDatabase();
    console.log("✅ Base de données initialisée\n");
    
    // 1. Récupérer le premier proxy actif
    console.log("⏳ Récupération d'un proxy actif...");
    const proxies = await db.select().from(schema.proxies)
      .where(eq(schema.proxies.status, 'active'))
      .limit(1);
    
    if (proxies.length === 0) {
      console.log("❌ Aucun proxy actif trouvé!");
      return;
    }
    
    const proxy = proxies[0];
    console.log(`✅ Proxy trouvé: ID ${proxy.id} (${proxy.host}:${proxy.port})\n`);
    
    // 2. Options spécifiques pour Trustpilot
    const trustpilotOptions = [
      'session_sticky',
      'session-lifetime=60',
      'country-us',
      'ssl',
      'keep_headers',
      'trustpilot_specific',
      'rotate_user_agent',
      'allow_domains-trustpilot.com,business.trustpilot.com,consumer-auth.trustpilot.com',
      'whitelist_domains-trustpilot.com,business.trustpilot.com,consumer-auth.trustpilot.com'
    ].join(',');
    
    // 3. Mise à jour du proxy avec les options Trustpilot
    console.log("⏳ Mise à jour du proxy pour Trustpilot...");
    
    const optimizedUsername = `${BRIGHTDATA_USERNAME}-${trustpilotOptions}`;
    
    await db.update(schema.proxies)
      .set({
        username: optimizedUsername,
        password: BRIGHTDATA_PASSWORD,
        // On ne met pas à jour les autres champs pour ne pas perturber la structure existante
      })
      .where(eq(schema.proxies.id, proxy.id));
    
    console.log("✅ Proxy mis à jour avec la configuration Trustpilot\n");
    
    // 4. Test de connexion avec le proxy mis à jour
    console.log("⏳ Test de connexion à Trustpilot avec le proxy mis à jour...");
    
    const proxyUrl = `http://${optimizedUsername}:${BRIGHTDATA_PASSWORD}@${proxy.host}:${proxy.port}`;
    const httpsAgent = new HttpsProxyAgent(proxyUrl);
    
    try {
      const response = await axios.get('https://www.trustpilot.com', {
        httpsAgent,
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log(`✅ Connexion réussie à Trustpilot (status: ${response.status})`);
      
      if (response.data.includes('Trustpilot')) {
        console.log("✅ Contenu Trustpilot détecté dans la réponse");
      } else {
        console.log("⚠️ Contenu Trustpilot non détecté dans la réponse");
      }
      
    } catch (error) {
      console.error("❌ Erreur lors du test avec le proxy mis à jour:", error.message);
      
      if (error.response) {
        console.error(`   - Status: ${error.response.status}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour et du test du proxy:", error);
  } finally {
    // Fermer la connexion à la base de données
    await closeDatabase();
  }
}

/**
 * Exécution des tests
 */
async function runAllTests(): Promise<void> {
  console.log("🔍 TESTS DE CONNEXION TRUSTPILOT\n");
  
  // Test de connexion directe
  await testTrustpilotDirectConnection();
  
  // Mise à jour et test d'un proxy existant
  await updateAndTestExistingProxy();
  
  console.log("\n✅ Tous les tests terminés");
}

// Exécuter le script
runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur non gérée:", error);
    process.exit(1);
  });