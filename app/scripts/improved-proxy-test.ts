/**
 * Test avancé de connectivité pour les proxies Bright Data
 * 
 * Ce script teste différentes configurations de proxies Bright Data pour identifier
 * la meilleure approche de connexion et résoudre les problèmes de SSL.
 * Il teste à la fois les configurations http et https pour identifier la source du problème.
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
// NOTE: Nous n'utilisons que HttpsProxyAgent pour tous les tests car http-proxy-agent n'est pas disponible
import * as fs from 'fs';
import * as path from 'path';

// Désactiver la vérification des certificats SSL pour les tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Récupérer les identifiants depuis les variables d'environnement
const BRIGHTDATA_USERNAME = process.env.BRIGHT_DATA_USERNAME || '';
const BRIGHTDATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD || '';

// Points d'accès à tester
const ENDPOINTS = [
  { host: 'brd.superproxy.io', port: 22225 },
  { host: 'zproxy.lum-superproxy.io', port: 22225 },
  { host: 'brd-customer.zproxy.lum-superproxy.io', port: 22225 }
];

// Pays à tester - Réduit pour tests plus rapides
const COUNTRIES = ['us', 'fr'];

// URLs de test - Réduit pour tests plus rapides
const TEST_URLS = [
  'https://lumtest.com/myip.json',
  'https://ifconfig.me/ip'
];

// Dossier pour les logs
const LOG_DIR = path.join(process.cwd(), 'proxy_test_logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Nom de fichier pour les logs
const LOG_FILE = path.join(LOG_DIR, `proxy_test_${new Date().toISOString().replace(/:/g, '-')}.log`);

// Fonction pour logger les messages
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Fonction pour masquer le mot de passe dans les URLs de proxy pour l'affichage
function maskPassword(url: string): string {
  return url.replace(/:[^:@]+@/, ':***@');
}

/**
 * Teste un proxy avec différentes configurations
 */
async function testProxyConfiguration(
  endpoint: { host: string; port: number },
  country: string,
  protocol: 'http' | 'https',
  testUrl: string,
  options: Record<string, string> = {}
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  statusCode?: number;
}> {
  // Construire le nom d'utilisateur avec les options
  let username = BRIGHTDATA_USERNAME;
  
  // Ajouter le code pays si spécifié
  if (country) {
    username = `${username}-country-${country}`;
  }
  
  // Ajouter des options supplémentaires si nécessaires
  if (Object.keys(options).length > 0) {
    const optionsStr = Object.entries(options)
      .map(([key, value]) => `${key}-${value}`)
      .join('-');
    
    username = `${username}-${optionsStr}`;
  }
  
  // Construire l'URL du proxy
  const proxyUrl = `${protocol}://${username}:${BRIGHTDATA_PASSWORD}@${endpoint.host}:${endpoint.port}`;
  
  log(`Test de proxy: ${maskPassword(proxyUrl)}`);
  log(`URL de test: ${testUrl}`);
  
  // Créer l'agent proxy approprié - Nous utilisons uniquement HttpsProxyAgent
  const agent = new HttpsProxyAgent(proxyUrl);
  
  const startTime = Date.now();
  
  try {
    // Configurer axios avec le proxy
    const response = await axios.get(testUrl, {
      httpsAgent: agent,
      timeout: 30000, // 30 secondes de timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Vérifier si la réponse contient des données
    if (response.data) {
      log(`✅ Succès! Statut ${response.status}, durée: ${duration}ms`);
      log(`Données: ${JSON.stringify(response.data).substring(0, 200)}${JSON.stringify(response.data).length > 200 ? '...' : ''}`);
      
      return {
        success: true,
        data: response.data,
        duration,
        statusCode: response.status
      };
    } else {
      log(`⚠️ Réponse sans données, statut: ${response.status}, durée: ${duration}ms`);
      
      return {
        success: false,
        error: 'Réponse sans données',
        duration,
        statusCode: response.status
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    log(`❌ Erreur: ${error.message}, durée: ${duration}ms`);
    
    if (error.response) {
      log(`Statut HTTP: ${error.response.status}`);
      
      return {
        success: false,
        error: `Erreur HTTP ${error.response.status}: ${error.message}`,
        duration,
        statusCode: error.response.status
      };
    } else if (error.request) {
      log('Aucune réponse reçue du serveur');
      
      return {
        success: false,
        error: 'Aucune réponse reçue',
        duration
      };
    } else {
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }
}

/**
 * Exécute une série de tests pour évaluer différentes configurations
 */
async function runComprehensiveTests() {
  // Vérifier les identifiants
  if (!BRIGHTDATA_USERNAME || !BRIGHTDATA_PASSWORD) {
    log('❌ Erreur: Les identifiants Bright Data sont manquants. Veuillez définir BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD.');
    return;
  }
  
  log('=== Démarrage des tests complets de proxies Bright Data ===');
  log(`Timestamp: ${new Date().toISOString()}`);
  
  const results: Record<string, {
    success: number;
    failure: number;
    avgDuration: number;
  }> = {};
  
  // Tester uniquement la meilleure configuration basée sur les tests précédents
  // Protocole HTTP avec brd.superproxy.io et configuration standard
  const endpoint = ENDPOINTS[0]; // brd.superproxy.io
  const country = 'us';
  const protocol = 'http';
  const config = { label: 'Standard', options: {} as Record<string, string> };
  
  // Créer une clé unique pour cette configuration
  const configKey = `${endpoint.host}_${country}_${protocol}_${config.label}`;
  results[configKey] = {
    success: 0,
    failure: 0,
    avgDuration: 0
  };
  
  let totalDuration = 0;
  
  log(`\n==== Test de configuration optimale: ${endpoint.host}:${endpoint.port}, Pays: ${country}, Protocole: ${protocol}, Config: ${config.label} ====\n`);
  
  // Tester plusieurs URLs
  for (const url of TEST_URLS) {
    log(`\n-- Test URL: ${url} --`);
    
    const result = await testProxyConfiguration(
      endpoint,
      country,
      protocol,
      url,
      config.options
    );
    
    if (result.success) {
      results[configKey].success++;
    } else {
      results[configKey].failure++;
    }
    
    totalDuration += result.duration;
    
    // Petite pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calculer la durée moyenne
  if (TEST_URLS.length > 0) {
    results[configKey].avgDuration = Math.round(totalDuration / TEST_URLS.length);
  }
  
  log(`\n==== Résultats pour ${configKey} ====`);
  log(`Succès: ${results[configKey].success}/${TEST_URLS.length}`);
  log(`Échecs: ${results[configKey].failure}/${TEST_URLS.length}`);
  log(`Durée moyenne: ${results[configKey].avgDuration}ms`);
  
  
  // Résumé général
  log('\n\n=== RÉSUMÉ DES TESTS ===');
  
  const sortedResults = Object.entries(results)
    .sort((a, b) => b[1].success - a[1].success || a[1].avgDuration - b[1].avgDuration);
  
  log('Classement des configurations (meilleures en premier):');
  
  sortedResults.forEach(([configKey, stats], index) => {
    const successRate = Math.round((stats.success / (stats.success + stats.failure)) * 100);
    log(`${index + 1}. ${configKey}`);
    log(`   Taux de succès: ${successRate}%, Réussis: ${stats.success}, Échoués: ${stats.failure}, Durée moyenne: ${stats.avgDuration}ms`);
  });
  
  // Recommandations
  log('\n=== RECOMMANDATIONS ===');
  
  if (sortedResults.length > 0) {
    const [bestConfig, bestStats] = sortedResults[0];
    
    if (bestStats.success > 0) {
      log(`Configuration recommandée: ${bestConfig}`);
      log(`Taux de succès: ${Math.round((bestStats.success / (bestStats.success + bestStats.failure)) * 100)}%`);
    } else {
      log('❌ Aucune configuration n\'a réussi les tests. Vérifiez vos identifiants et la connectivité.');
    }
  } else {
    log('❌ Aucun résultat de test disponible.');
  }
}

// Exécuter les tests
(async () => {
  try {
    log('Démarrage du script de test de proxies Bright Data...');
    await runComprehensiveTests();
    log('Tests terminés.');
  } catch (error) {
    log(`Erreur non gérée: ${error instanceof Error ? error.message : String(error)}`);
  }
})();