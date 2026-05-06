/**
 * Test minimal de publication d'un avis via l'API
 * 
 * Ce script est une version épurée qui se concentre uniquement sur la partie essentielle
 * de la publication immédiate d'un avis.
 */

import axios from 'axios';
import * as fs from 'fs';
import { promisify } from 'util';
import * as crypto from 'crypto';

// Fonction pour générer un ID unique
function generateUniqueId() {
  return crypto.randomBytes(16).toString('hex');
}

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

async function testMinimalReview() {
  console.log("=== TEST MINIMAL DE PUBLICATION D'AVIS ===");
  
  try {
    // Utiliser des IDs connus qui fonctionnent
    const businessId = 9; // L'ID de DOGEVISION
    const accountId = 12; // ID d'un compte Google actif
    const proxyId = 8;    // ID d'un proxy optimisé pour Google
    
    console.log(`Configuration: Business ID: ${businessId}, Account ID: ${accountId}, Proxy ID: ${proxyId}`);
    
    // Préparer les données pour l'avis avec plus de simplicité
    const timestamp = new Date().toLocaleTimeString();
    const sessionId = generateUniqueId();
    
    const reviewData = {
      businessId: businessId,
      rating: 5,
      content: `★★★★★ Test minimal de publication d'avis.
      Service excellent et équipe professionnelle.
      Test effectué le ${new Date().toLocaleDateString()}, ${timestamp}.`,
      platform: "google",
      accountId: accountId,
      proxyId: proxyId,
      status: "pending",
      sessionId: sessionId,
      // Options supplémentaires pour minimiser les ressources
      options: {
        minimal_resources: true,
        skip_screenshots: true,
        timeout_multiplier: 0.5, // Réduit les temps d'attente
        fast_mode: true
      }
    };
    
    console.log("Données de l'avis:", reviewData);
    
    // Envoyer la requête à l'API
    console.log("\nEnvoi de la requête à l'API...");
    
    try {
      const response = await axios.post('http://localhost:5000/api/immediate-review', reviewData);
      
      console.log("\nRéponse de l'API:", response.data);
      
      // Enregistrer les informations du test
      await mkdirAsync('./test_reports', { recursive: true });
      
      await writeFileAsync(
        './test_reports/minimal_review_test.json',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          businessId: businessId,
          accountId: accountId,
          proxyId: proxyId,
          reviewData,
          apiResponse: response.data
        }, null, 2)
      );
      
      console.log("\nRésultats du test enregistrés dans ./test_reports/minimal_review_test.json");
      
      // Attendre 5 secondes et vérifier le statut
      console.log("\nAttente de 5 secondes pour vérifier le statut...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Vérifier le statut avec une requête API
      const statusResponse = await axios.get(`http://localhost:5000/api/review-status/${response.data.reviewId}`);
      console.log("\nStatut de l'avis:", statusResponse.data);
      
      return {
        success: true,
        message: "Test de publication d'avis minimal exécuté avec succès",
        reviewId: response.data.reviewId,
        status: statusResponse.data
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
testMinimalReview()
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