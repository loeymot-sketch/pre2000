/**
 * Test direct du contrôleur de proxies
 * 
 * Ce script contourne le serveur express et appelle directement
 * les services pour configurer et tester les proxies Bright Data.
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { db } from './server/db';
import { proxies as proxiesTable } from './shared/schema';
import { storage } from './server/storage';
import { ProxyService } from './server/services/proxy.service';

// Les variables d'environnement sont déjà chargées dans le système

async function main() {
  console.log('Démarrage du test direct du contrôleur de proxies...');
  
  // Vérifier les identifiants Bright Data
  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;
  
  if (!username || !password) {
    console.error('❌ Les identifiants Bright Data manquent. Veuillez configurer BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD.');
    return;
  }
  
  console.log('✅ Identifiants Bright Data présents');
  console.log(`Utilisateur: ${username.substring(0, 3)}...`);
  
  try {
    // Récupérer les proxies existants
    const existingProxies = await storage.getProxies();
    console.log(`📊 Nombre de proxies existants: ${existingProxies.length}`);
    
    // Configurer les proxies pour 3 pays
    const countries = ["FR", "UK", "DE"];
    console.log(`🌍 Configuration des proxies pour les pays: ${countries.join(', ')}`);
    
    const createdProxies = [];
    const failedProxies = [];
    
    for (const country of countries) {
      try {
        // Convertir le code pays au format Bright Data
        let brightDataCountry = country.toLowerCase();
        if (country === "UK") brightDataCountry = "gb";
        
        // Créer une session unique pour ce proxy
        const session = `geo_${country.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
        
        // Créer la configuration du proxy
        const proxyConfig = {
          host: "brd.superproxy.io",
          port: 22225, // Port standard pour les proxies résidentiels
          username: `${username}-country-${brightDataCountry}-session-${session}`,
          password: password,
          type: "residential",
          country: country,
          isResidential: true,
          status: "testing", // Marquer comme en test jusqu'à validation
          metadata: {
            country: brightDataCountry,
            session: session,
            provider: "brightdata"
          }
        };
        
        console.log(`🧪 Test du proxy ${proxyConfig.country} avec session ${session}...`);
        
        // Créer une instance HttpsProxyAgent pour tester le proxy
        const proxyUrl = `http://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        
        // Tester avec le site lumtest.com qui renvoie l'IP et le pays
        const testResponse = await axios.get('https://lumtest.com/myip.json', {
          httpsAgent: proxyAgent,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        
        // Vérifier si la réponse contient les informations IP
        if (testResponse.data && testResponse.data.ip) {
          console.log(`✅ Proxy ${proxyConfig.country} fonctionne. IP: ${testResponse.data.ip}, Pays: ${testResponse.data.country}`);
          
          // Vérifier la cohérence géographique
          const detectedCountry = testResponse.data.country;
          const geoConsistent = detectedCountry && detectedCountry.toLowerCase() === brightDataCountry.toLowerCase();
          
          // Ajouter les informations de géolocalisation
          const proxyToSave = {
            host: proxyConfig.host,
            port: proxyConfig.port,
            username: proxyConfig.username,
            password: proxyConfig.password,
            type: proxyConfig.type,
            country: proxyConfig.country,
            isResidential: proxyConfig.isResidential,
            status: "active",
            lastTested: new Date(),
            lastUsed: new Date(),
            // Stockage des données de géolocalisation dans les metadata
            metadata: {
              ...proxyConfig.metadata,
              ipAddress: testResponse.data.ip,
              detectedCountry: detectedCountry,
              geoConsistent: geoConsistent,
              geoConsistencyResolution: geoConsistent ? "matched" : "mismatch_country",
              brightdataSession: session
            }
          };
          
          // Enregistrer dans la base de données
          const newProxy = await storage.createProxy(proxyToSave);
          
          createdProxies.push({
            id: newProxy.id,
            country: newProxy.country,
            ipAddress: testResponse.data.ip,
            detectedCountry: detectedCountry,
            geoConsistent: geoConsistent
          });
          
          console.log(`✅ Proxy pour ${proxyConfig.country} enregistré avec l'ID: ${newProxy.id}`);
        } else {
          console.error(`❌ Échec du test pour le proxy ${proxyConfig.country}. Réponse invalide.`);
          failedProxies.push({
            country: country,
            reason: "Test response invalid"
          });
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la configuration du proxy pour ${country}:`, error);
        failedProxies.push({
          country: country,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Récupérer les nouveaux proxies après configuration
    const newProxies = await storage.getProxies();
    console.log(`📊 Nombre de proxies après configuration: ${newProxies.length}`);
    console.log(`✅ ${createdProxies.length} proxies créés avec succès`);
    console.log(`❌ ${failedProxies.length} échecs`);
    
    if (failedProxies.length > 0) {
      console.log('Détails des échecs:');
      for (const failed of failedProxies) {
        console.log(`- Pays: ${failed.country}, Raison: ${failed.reason}`);
      }
    }
    
    // Vérifier la cohérence géographique
    const proxyService = ProxyService.getInstance();
    const geoConsistencyReport = await proxyService.checkGeoConsistency();
    
    console.log(`\n📍 Analyse de cohérence géographique:`);
    console.log(`- Paires compatibles: ${geoConsistencyReport.matchedPairs.length}`);
    console.log(`- Comptes sans proxy correspondant: ${geoConsistencyReport.unmatchedAccounts.length}`);
    console.log(`- Proxies sans compte correspondant: ${geoConsistencyReport.unmatchedProxies.length}`);
    console.log(`- Taux de cohérence: ${geoConsistencyReport.consistencyRate}%`);
    
  } catch (error) {
    console.error('Erreur lors du test du contrôleur de proxies:', error);
  } finally {
    console.log('\nTest du contrôleur de proxies terminé.');
    process.exit(0);
  }
}

main();