/**
 * Test de connexion aux proxies Bright Data
 * 
 * Ce script teste la connexion aux proxies Bright Data
 * en utilisant les configurations standard et par pays.
 */

// Désactiver temporairement la vérification des certificats pour les tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';

// Récupération des informations d'authentification depuis les variables d'environnement
const BRIGHT_DATA_USERNAME = process.env.BRIGHT_DATA_USERNAME;
const BRIGHT_DATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD;

// Configuration du fichier de log
const LOG_FILE = `./brightdata-proxy-test-${Date.now()}.log`;

// Log helper
function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

// Configuration des proxies à tester
const proxyConfigs = [
  {
    name: 'Default Proxy',
    host: 'brd.superproxy.io',
    port: 22225,
    country: 'default',
    format: 'standard'
  },
  {
    name: 'Default Proxy (Alternative Format)',
    host: 'brd.superproxy.io',
    port: 22225,
    country: 'default',
    format: 'alternative'
  },
  {
    name: 'France Proxy (zone)',
    host: 'brd.superproxy.io',
    port: 22225,
    country: 'fr',
    format: 'standard'
  },
  {
    name: 'UK Proxy (zone)',
    host: 'brd.superproxy.io',
    port: 22225,
    country: 'uk',
    format: 'standard'
  },
  {
    name: 'Germany Proxy (zone)',
    host: 'brd.superproxy.io',
    port: 22225,
    country: 'de',
    format: 'standard'
  }
];

// Sites à tester
const testUrls = [
  'https://api.ipify.org?format=json',  // Affiche l'IP externe
  'https://httpbin.org/get',            // Test simple GET
  'https://www.google.com'              // Test connexion à Google
];

// Test un proxy spécifique avec une URL
async function testProxy(proxyConfig: typeof proxyConfigs[0], url: string) {
  if (!BRIGHT_DATA_USERNAME || !BRIGHT_DATA_PASSWORD) {
    log('❌ Erreur: Les identifiants Bright Data (BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD) doivent être définis dans les variables d\'environnement.');
    return { success: false, error: 'Missing credentials' };
  }

  // Format proxyUrl en fonction du pays et du format choisi
  let proxyUrl;
  
  if (proxyConfig.format === 'alternative') {
    // Format alternatif: session-[pays]_[username]:[password]
    const country = proxyConfig.country === 'default' ? '' : `-${proxyConfig.country}`;
    proxyUrl = `http://session${country}_${BRIGHT_DATA_USERNAME}:${BRIGHT_DATA_PASSWORD}@${proxyConfig.host}:${proxyConfig.port}`;
  } else {
    // Format standard
    if (proxyConfig.country === 'default') {
      proxyUrl = `http://${BRIGHT_DATA_USERNAME}:${BRIGHT_DATA_PASSWORD}@${proxyConfig.host}:${proxyConfig.port}`;
    } else {
      proxyUrl = `http://${BRIGHT_DATA_USERNAME}-country-${proxyConfig.country}:${BRIGHT_DATA_PASSWORD}@${proxyConfig.host}:${proxyConfig.port}`;
    }
  }
  
  log(`🔄 Test de ${proxyConfig.name} avec ${url}...`);
  log(`🔧 URL du proxy: ${proxyUrl.replace(BRIGHT_DATA_PASSWORD!, '****')}`);
  
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const response = await axios.get(url, {
      httpsAgent: agent,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    log(`✅ ${proxyConfig.name} a réussi à accéder à ${url} (Status: ${response.status})`);
    
    if (url.includes('ipify')) {
      log(`📍 IP détectée via ${proxyConfig.name}: ${JSON.stringify(response.data)}`);
    }
    
    return { 
      success: true, 
      status: response.status,
      data: url.includes('ipify') ? response.data : null 
    };
  } catch (error: any) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (error.response) {
      errorMessage = `Statut HTTP ${error.response.status}: ${errorMessage}`;
    }
    
    log(`❌ Échec avec ${proxyConfig.name} pour ${url}: ${errorMessage}`);
    
    return { 
      success: false, 
      error: errorMessage,
      status: error.response?.status
    };
  }
}

// Test tous les proxies avec toutes les URLs
async function testAllProxies() {
  log('🚀 Démarrage des tests de proxies Bright Data...');
  
  const results = {
    totalTests: 0,
    successfulTests: 0,
    failedTests: 0,
    detailedResults: [] as any[]
  };
  
  for (const proxyConfig of proxyConfigs) {
    log(`\n📌 Test du proxy ${proxyConfig.name}...`);
    
    for (const url of testUrls) {
      results.totalTests++;
      const result = await testProxy(proxyConfig, url);
      
      if (result.success) {
        results.successfulTests++;
      } else {
        results.failedTests++;
      }
      
      results.detailedResults.push({
        proxy: proxyConfig.name,
        url,
        success: result.success,
        status: result.status,
        error: result.error,
        data: result.data
      });
    }
  }
  
  // Résultats finaux
  log('\n📊 RÉSULTATS DES TESTS:');
  log(`📈 Total des tests: ${results.totalTests}`);
  log(`✅ Tests réussis: ${results.successfulTests}`);
  log(`❌ Tests échoués: ${results.failedTests}`);
  log(`🧮 Taux de réussite: ${(results.successfulTests / results.totalTests * 100).toFixed(2)}%`);
  
  return results;
}

// Fonction principale
async function main() {
  try {
    if (!BRIGHT_DATA_USERNAME || !BRIGHT_DATA_PASSWORD) {
      log('❌ ERREUR: Variables d\'environnement requises non définies');
      log('Les variables BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD doivent être définies');
      process.exit(1);
    }
    
    await testAllProxies();
    log('🏁 Tests terminés');
  } catch (error) {
    log(`❌ Erreur générale: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Exécution
main();