/**
 * Test des proxies intégrés dans l'application
 * 
 * Ce script vérifie la connexion aux proxies dans un format 
 * similaire à celui utilisé par l'application
 */

// Désactiver temporairement la vérification des certificats pour les tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import pg from 'pg';
import fs from 'fs';

// Configuration
const LOG_FILE = `./application-proxy-test-${Date.now()}.log`;

// Fonction pour la journalisation
function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

/**
 * Établit une connexion à la base de données
 */
async function getDbConnection() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  return pool;
}

/**
 * Récupère tous les proxies de la base de données
 */
async function getProxiesFromDatabase(pool: pg.Pool) {
  log('📊 Récupération des proxies depuis la base de données...');
  
  const result = await pool.query(
    "SELECT * FROM proxies WHERE status = 'active'"
  );
  
  log(`✅ ${result.rows.length} proxies trouvés`);
  return result.rows;
}

/**
 * Teste un proxy spécifique avec une URL cible
 */
async function testProxy(proxy: any, url: string) {
  log(`🔄 Test du proxy ID ${proxy.id} (${proxy.country}) avec ${url}...`);
  
  // Récupération des identifiants
  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;
  
  if (!username || !password) {
    log('❌ Erreur: Les identifiants Bright Data doivent être définis');
    return { success: false, error: 'Identifiants manquants' };
  }
  
  // Construction de l'URL du proxy selon le modèle de l'application
  let proxyUrl: string;
  
  if (proxy.type === 'residential') {
    // Format pour les proxies résidentiels avec ciblage par pays
    proxyUrl = `http://${username}-country-${proxy.country.toLowerCase()}:${password}@brd.superproxy.io:22225`;
  } else {
    // Format standard
    proxyUrl = `http://${username}:${password}@${proxy.host}:${proxy.port}`;
  }
  
  log(`🔧 URL du proxy: ${proxyUrl.replace(password, '****')}`);
  
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    
    // Configurer le temps d'attente maximum à 30 secondes
    const response = await axios.get(url, {
      httpsAgent: agent,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    log(`✅ Proxy ID ${proxy.id} (${proxy.country}) a réussi (Status: ${response.status})`);
    
    if (url.includes('ipify')) {
      const ipData = response.data;
      log(`📍 IP détectée: ${JSON.stringify(ipData)}`);
      
      // Mettre à jour la date de dernière vérification et le statut dans la base de données
      return { 
        success: true, 
        ip: ipData.ip, 
        status: response.status 
      };
    }
    
    return { success: true, status: response.status };
  } catch (error: any) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (error.response) {
      errorMessage = `Statut HTTP ${error.response.status}: ${errorMessage}`;
    }
    
    log(`❌ Échec avec proxy ID ${proxy.id}: ${errorMessage}`);
    
    return { 
      success: false, 
      error: errorMessage, 
      status: error.response?.status 
    };
  }
}

/**
 * Fonction principale pour tester tous les proxies
 */
async function testAllProxies() {
  try {
    log('🚀 Démarrage des tests de proxies de l\'application...');
    
    // 1. Connexion à la base de données
    const pool = await getDbConnection();
    
    // 2. Récupérer tous les proxies actifs
    const proxies = await getProxiesFromDatabase(pool);
    
    // Si pas de proxies, en créer un pour le test
    if (proxies.length === 0) {
      log('⚠️ Aucun proxy trouvé dans la base de données. Création d\'un proxy de test...');
      
      const result = await pool.query(`
        INSERT INTO proxies (
          host, port, username, password, country, type, status, "lastChecked"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [
        'brd.superproxy.io',
        22225,
        process.env.BRIGHT_DATA_USERNAME || 'placeholder',
        'placeholder', // Ne jamais stocker le mot de passe réel en clair
        'FR',
        'residential',
        'active',
        new Date()
      ]);
      
      proxies.push(result.rows[0]);
      log(`✅ Proxy de test créé avec ID ${result.rows[0].id}`);
    }
    
    // URL de test
    const testUrl = 'https://api.ipify.org?format=json';
    
    // 3. Tester chaque proxy
    log(`\n📌 Test de ${proxies.length} proxies...`);
    
    const results = {
      totalTests: proxies.length,
      successfulTests: 0,
      failedTests: 0,
      detailedResults: [] as any[]
    };
    
    for (const proxy of proxies) {
      const result = await testProxy(proxy, testUrl);
      
      if (result.success) {
        results.successfulTests++;
        
        // Mise à jour du statut du proxy
        await pool.query(
          `UPDATE proxies SET status = $1, "lastChecked" = $2, "lastSuccessTime" = $3, ip = $4 WHERE id = $5`,
          ['active', new Date(), new Date(), result.ip, proxy.id]
        );
      } else {
        results.failedTests++;
        
        // Incrémenter le compteur d'échecs
        await pool.query(
          `UPDATE proxies SET status = $1, "lastChecked" = $2, "consecutiveFailures" = COALESCE("consecutiveFailures", 0) + 1 WHERE id = $3`,
          ['error', new Date(), proxy.id]
        );
      }
      
      results.detailedResults.push({
        proxyId: proxy.id,
        country: proxy.country,
        success: result.success,
        ip: result.ip,
        error: result.error
      });
    }
    
    // 4. Afficher les résultats
    log('\n📊 RÉSULTATS DES TESTS:');
    log(`📈 Total des proxies testés: ${results.totalTests}`);
    log(`✅ Tests réussis: ${results.successfulTests}`);
    log(`❌ Tests échoués: ${results.failedTests}`);
    log(`🧮 Taux de réussite: ${(results.successfulTests / results.totalTests * 100).toFixed(2)}%`);
    
    // 5. Fermer la connexion à la base de données
    await pool.end();
    
    return results;
  } catch (error) {
    log(`❌ Erreur générale: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, error };
  }
}

// Exécution
async function main() {
  try {
    if (!process.env.BRIGHT_DATA_USERNAME || !process.env.BRIGHT_DATA_PASSWORD) {
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