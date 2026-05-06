/**
 * Test de publication d'avis en mode simulation pure
 * 
 * Ce script utilise le mode de simulation pur qui ne lance pas de navigateur réel
 * mais simule une publication réussie, ce qui est parfait pour tester le flow complet
 * dans l'environnement Replit avec ses contraintes de ressources.
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

/**
 * Exécute un test complet en mode simulation
 */
async function testSimulationMode() {
  console.log("=== TEST EN MODE SIMULATION D'UN AVIS ===");
  
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
      content: `★★★★★ Mode simulation pure pour ReviewFlow Automator.
      Test critique qui évite toute utilisation de navigateur.
      Le système est efficace et performant dans toutes les conditions.
      Test effectué le ${new Date().toLocaleDateString()}, ${timestamp}.`,
      platform: "google",
      accountId: accountId,
      proxyId: proxyId,
      status: "pending",
      sessionId: sessionId,
      // Options pour activer le mode simulation
      options: {
        simulation_mode: true // Cette option est la clé - elle active le mode simulation pure
      }
    };
    
    console.log("Données de l'avis:", reviewData);
    
    // Envoyer la requête à l'API
    console.log("\nEnvoi de la requête à l'API en mode simulation pure...");
    
    try {
      const response = await axios.post('http://localhost:5000/api/immediate-review', reviewData);
      
      console.log("\nRéponse de l'API:", response.data);
      
      if (!response.data.success) {
        console.error("La requête a échoué:", response.data.message);
        return {
          success: false,
          message: response.data.message,
          reviewId: response.data.reviewId
        };
      }
      
      // Enregistrer les informations du test
      await mkdirAsync('./test_reports', { recursive: true });
      
      await writeFileAsync(
        './test_reports/simulation_mode_test.json',
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
      
      console.log("\nRésultats du test enregistrés dans ./test_reports/simulation_mode_test.json");
      
      // Attendre 5 secondes et vérifier le statut
      console.log("\nAttente de 5 secondes pour vérifier le statut final...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Vérifier le statut avec une requête API
      const statusResponse = await axios.get(`http://localhost:5000/api/review-status/${response.data.reviewId}`);
      console.log("\nStatut final de l'avis:", statusResponse.data);
      
      // Vérifier que l'avis a été correctement posté
      if (statusResponse.data.status === 'posted') {
        console.log("\n✅ SUCCÈS: L'avis a été correctement publié en mode simulation");
        return {
          success: true,
          message: "Test de publication en mode simulation exécuté avec succès",
          reviewId: response.data.reviewId,
          status: statusResponse.data
        };
      } else {
        console.log("\n❌ ÉCHEC: L'avis n'a pas été publié correctement");
        return {
          success: false,
          message: `L'avis a le statut ${statusResponse.data.status} au lieu de 'posted'`,
          reviewId: response.data.reviewId,
          status: statusResponse.data
        };
      }
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
testSimulationMode()
  .then(result => {
    console.log(`\nRésultat final: ${result.success ? "SUCCÈS ✓" : "ÉCHEC ✗"}`);
    console.log(`Message: ${result.message}`);
    console.log("\n=== TEST TERMINÉ ===");
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error("\nErreur non gérée:", error);
    process.exit(1);
  });