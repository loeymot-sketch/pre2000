/**
 * Test réel de publication d'un avis
 * 
 * Ce script teste le processus complet de publication d'un avis
 * en utilisant l'API de l'application.
 */

import axios from 'axios';
import { db } from './server/db';
import * as fs from 'fs';
import { promisify } from 'util';
import * as crypto from 'crypto';

// Fonction pour générer un ID unique similaire à uuid
function generateUniqueId() {
  return crypto.randomBytes(16).toString('hex');
}

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Test de publication d'un avis via l'API
 */
async function testRealReviewPosting() {
  console.log("=== TEST RÉEL DE PUBLICATION D'AVIS ===");
  
  try {
    // 1. Vérifier que nous avons les données nécessaires
    console.log("\nVérification des données requises...");
    
    // Récupérer une entreprise de test (DOGEVISION pour le test)
    const businessResult = await db.execute(`
      SELECT * FROM businesses 
      WHERE name = 'DOGEVISION'
      LIMIT 1
    `);
    
    if (businessResult.rows.length === 0) {
      throw new Error("Aucune entreprise DOGEVISION trouvée pour le test");
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
    
    const sessionId = generateUniqueId(); // Génère un ID de session unique pour le suivi
    const timestamp = new Date().toLocaleTimeString();
    
    const reviewData = {
      businessId: business.id,
      rating: 5,
      content: `★★★★★ Publication de test réel. 
      Excellent service! Interface utilisateur intuitive et équipe réactive. 
      Je recommande vivement à tous ceux qui cherchent une solution fiable.
      Test effectué le ${new Date().toLocaleDateString()}, ${timestamp}.`,
      platform: "google",
      accountId: account.id,
      proxyId: proxy.id,
      status: "pending",
      sessionId: sessionId
    };
    
    console.log("Données de l'avis:", reviewData);
    
    // 3. Envoyer la requête à l'API
    console.log("\nEnvoi de la requête à l'API...");
    
    try {
      // Cette fois-ci, nous appelons réellement le endpoint
      const response = await axios.post('http://localhost:5000/api/immediate-review', reviewData);
      
      console.log("Réponse de l'API:", response.data);
      
      // 4. Enregistrer les informations du test
      await mkdirAsync('./test_reports', { recursive: true });
      
      await writeFileAsync(
        './test_reports/real_review_posting_test.json',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
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
          apiResponse: response.data
        }, null, 2)
      );
      
      console.log("\nRésultats du test enregistrés dans ./test_reports/real_review_posting_test.json");
      
      // 5. Vérifier le statut de l'avis après 10 secondes
      console.log("\nAttente de 10 secondes pour vérifier le statut...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const reviewResult = await db.execute(`
        SELECT * FROM reviews 
        WHERE content LIKE '%${timestamp}%'
        ORDER BY id DESC
        LIMIT 1
      `);
      
      if (reviewResult.rows.length > 0) {
        const reviewStatus = reviewResult.rows[0];
        console.log(`\nStatut de l'avis: ${reviewStatus.status}`);
        console.log(`Message d'erreur (si échec): ${reviewStatus.error || 'Aucun'}`);
      } else {
        console.log("\nAucun avis trouvé avec l'horodatage spécifique.");
      }
      
      return {
        success: true,
        message: "Test de publication d'avis exécuté avec succès",
        review: reviewResult.rows.length > 0 ? reviewResult.rows[0] : null
      };
    } catch (error) {
      console.error("Erreur lors de l'envoi de la requête:", error);
      
      return {
        success: false,
        message: `Erreur: ${error.message}`,
        error: error
      };
    }
  } catch (error) {
    console.error("Erreur lors du test:", error);
    
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      error: error
    };
  }
}

// Exécuter le test
testRealReviewPosting()
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