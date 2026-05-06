/**
 * Test complet de publication d'un avis
 * 
 * Ce script teste le processus complet de publication d'un avis
 * en utilisant notre infrastructure optimisée.
 */

import { db } from './server/db';
import * as fs from 'fs';
import { promisify } from 'util';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import axios from 'axios';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Configurer puppeteer avec le plugin stealth
puppeteer.use(StealthPlugin());

/**
 * Test de publication d'un avis via l'API
 */
async function testReviewPosting() {
  console.log("=== TEST DE PUBLICATION D'AVIS ===");
  
  try {
    // 1. Vérifier que nous avons les données nécessaires
    console.log("\nVérification des données requises...");
    
    // Récupérer une entreprise de test
    const businessResult = await db.execute(`
      SELECT * FROM businesses 
      LIMIT 1
    `);
    
    if (businessResult.rows.length === 0) {
      throw new Error("Aucune entreprise trouvée pour le test");
    }
    
    const business = businessResult.rows[0];
    console.log(`Entreprise de test: ${business.name} (ID: ${business.id})`);
    
    // Récupérer un proxy optimisé pour Google
    const proxyResult = await db.execute(`
      SELECT * FROM proxies 
      WHERE status = 'active' 
      AND options::text LIKE '%google%'
      LIMIT 1
    `);
    
    if (proxyResult.rows.length === 0) {
      throw new Error("Aucun proxy optimisé pour Google trouvé");
    }
    
    const proxy = proxyResult.rows[0];
    console.log(`Proxy de test: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);
    
    // Récupérer un compte de test pour Google
    const accountResult = await db.execute(`
      SELECT * FROM posting_accounts
      WHERE platform = 'google'
      AND status = 'active'
      LIMIT 1
    `);
    
    if (accountResult.rows.length === 0) {
      throw new Error("Aucun compte Google actif trouvé");
    }
    
    const account = accountResult.rows[0];
    console.log(`Compte de test: ${account.email} (ID: ${account.id})`);
    
    // 2. Préparer les données pour l'avis
    console.log("\nPréparation des données pour l'avis...");
    
    const reviewData = {
      businessId: business.id,
      rating: 5,
      content: `Excellent service! J'ai vraiment apprécié l'expérience et je recommande fortement. L'équipe est professionnelle et attentionnée. Test effectué le ${new Date().toISOString().slice(0, 10)}`,
      platform: "google",
      accountId: account.id,
      proxyId: proxy.id,
      status: "pending"
    };
    
    console.log("Données de l'avis:", reviewData);
    
    // 3. Envoyer la requête à l'API
    console.log("\nEnvoi de la requête à l'API...");
    
    try {
      // Ne pas exécuter réellement le test pour éviter de publier un vrai avis
      // Nous nous arrêtons à cette étape
      console.log("SIMULATION: Envoi d'une requête à /api/immediate-review");
      
      // En mode réel, nous utiliserions:
      /*
      const response = await axios.post('http://localhost:5000/api/immediate-review', reviewData);
      console.log("Réponse de l'API:", response.data);
      */
      
      console.log("Test simulé réussi. En production, cela publierait un avis réel.");
      
      // 4. Enregistrer les informations du test
      await mkdirAsync('./test_reports', { recursive: true });
      
      await writeFileAsync(
        './test_reports/review_posting_test.json',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          business: {
            id: business.id,
            name: business.name
          },
          account: {
            id: account.id,
            email: account.email,
            platform: account.platform
          },
          proxy: {
            id: proxy.id,
            host: proxy.host
          },
          reviewData,
          result: "SIMULATION_SUCCESS"
        }, null, 2)
      );
      
      console.log("\nRésultats du test enregistrés dans ./test_reports/review_posting_test.json");
      
      return {
        success: true,
        message: "Test de publication d'avis simulé avec succès"
      };
    } catch (error) {
      console.error("Erreur lors de l'envoi de la requête:", error);
      
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  } catch (error) {
    console.error("Erreur lors du test:", error);
    
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
}

// Exécuter le test
testReviewPosting()
  .then(result => {
    console.log(`\nRésultat final: ${result.success ? "SUCCÈS" : "ÉCHEC"}`);
    console.log(`Message: ${result.message}`);
    console.log("\n=== TEST TERMINÉ ===");
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error("\nErreur non gérée:", error);
    process.exit(1);
  });