/**
 * Script de test pour vérifier la configuration des proxies BrightData
 * 
 * Ce script teste la configuration des proxies BrightData en utilisant la configuration
 * exactement comme dans l'exemple fourni, avec HttpsProxyAgent.
 */

import axios from 'axios';
import * as https from 'https';

// Importation dynamique pour éviter les problèmes avec les modules ESM/CommonJS
let HttpsProxyAgent: any;
try {
  // Essayer d'importer en tant que module ESM
  HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
} catch (error) {
  console.error("Erreur lors de l'importation de https-proxy-agent:", error);
  // Utiliser un agent HTTPS standard si l'importation échoue
  HttpsProxyAgent = https.Agent;
}

// Désactiver la vérification TLS pour les proxies (équivalent à NODE_TLS_REJECT_UNAUTHORIZED=0)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BRIGHTDATA_USERNAME = process.env.BRIGHT_DATA_USERNAME || '';
const BRIGHTDATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD || '';

// Configuration comme dans l'exemple fourni
const url = 'https://geo.brdtest.com/mygeo.json';
const proxy = `http://${BRIGHTDATA_USERNAME}:${BRIGHTDATA_PASSWORD}@brd.superproxy.io:33335`;

// Configuration avec options Google
const googleOptionsProxy = `http://${BRIGHTDATA_USERNAME}-session-sticky-session_id_${Math.random().toString(36).substring(2, 10)}-google_kyc-true:${BRIGHTDATA_PASSWORD}@brd.superproxy.io:33335`;

console.log("Test de configuration BrightData avec HttpsProxyAgent...");

async function testProxy(proxyUrl: string, testUrl: string, description: string) {
  console.log(`\nTest: ${description}`);
  console.log(`URL de proxy: ${proxyUrl.replace(/:([^:@]+)@/, ':***@')}`);
  
  const agent = new HttpsProxyAgent(proxyUrl);
  
  const axiosInstance = axios.create({
    timeout: 60000,
    httpsAgent: agent
  });

  try {
    console.log(`Envoi d'une requête à ${testUrl}...`);
    const startTime = Date.now();
    const response = await axiosInstance.get(testUrl);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Succès! Requête complétée en ${duration}ms`);
    console.log('Données reçues:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      duration,
      data: response.data
    };
  } catch (error: any) {
    console.error(`❌ Erreur lors de la requête:`);
    
    if (error.response) {
      console.error(`Statut HTTP: ${error.response.status}`);
      console.error('Données d\'erreur:', error.response.data);
    } else if (error.request) {
      console.error('Aucune réponse reçue du serveur');
    } else {
      console.error(`Message d'erreur: ${error.message}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  try {
    // Vérifier si les informations d'identification sont disponibles
    if (!BRIGHTDATA_USERNAME || !BRIGHTDATA_PASSWORD) {
      console.error('❌ Erreur: Variables d\'environnement BRIGHT_DATA_USERNAME et BRIGHT_DATA_PASSWORD manquantes');
      console.error('Veuillez configurer ces variables pour permettre le test');
      return;
    }

    // Test 1: Configuration standard
    await testProxy(proxy, url, "Configuration standard BrightData");
    
    // Test 2: Configuration optimisée pour Google
    await testProxy(googleOptionsProxy, url, "Configuration optimisée pour Google");
    
    // Test 3: Configuration pour accéder à Google
    await testProxy(googleOptionsProxy, 'https://www.google.com', "Accès à Google avec proxy optimisé");
    
  } catch (error) {
    console.error('Erreur non gérée:', error);
  }
}

main();