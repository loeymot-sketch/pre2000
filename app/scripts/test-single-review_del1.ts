/**
 * Test simple pour publier un seul avis via l'API
 * 
 * Ce script teste la publication d'un avis immédiat en utilisant notre
 * configuration optimisée pour Replit.
 */

import axios from 'axios';
import { initializeDatabase, closeDatabase } from './server/db';
import { storage } from './server/storage';
import { initializeStorage } from './server/storage';
import { Business } from './shared/schema';
import { logger } from './server/services/logger.service';

async function getOrCreateTestBusiness() {
  // Récupérer les business existants
  const businesses = await storage.getBusinesses();
  
  // Voir si Doge Vision existe déjà
  let business = businesses.find(b => b.name.includes('Doge Vision'));
  
  // Si non, le créer
  if (!business) {
    business = await storage.createBusiness({
      name: 'Doge Vision',
      type: 'service',
      description: 'Educational platform for learning about crypto',
      products: 'crypto token presale',
      keywords: 'crypto, education, blockchain',
      websiteUrl: 'https://www.doge-vision.com/en',
      userId: 4 // Utiliser le même userId que les autres DOGEVISION businesses
    });
    
    console.log(`✅ Business de test créé avec l'ID ${business.id}`);
  } else {
    console.log(`✅ Business de test existant utilisé avec l'ID ${business.id}`);
  }
  
  return business;
}

async function testSingleReview() {
  try {
    console.log("🧪 DÉMARRAGE DU TEST DE PUBLICATION D'AVIS UNIQUE\n");
    
    await initializeDatabase();
    await initializeStorage(true);
    console.log("✅ Base de données et stockage initialisés");
    
    // Obtenir ou créer un business pour le test
    const business = await getOrCreateTestBusiness();
    
    // Formater les données pour l'API
    const reviewData = {
      business_id: business.id,
      content: '★★★★★ Excellent learning platform. I really enjoyed learning on this platform. The lessons are clear and well-structured, and the community is very supportive. Definitely recommend for anyone interested in the crypto space!',
      // Utilisation de l'API immédiate
      post_immediately: true,
      // Pas besoin de schedule si c'est immédiat
      schedule: null,
      // Autres paramètres optionnels
      platform: 'google', // Plateforme cible pour cet avis
      language: 'en'
    };
    
    console.log("\n📝 Données de l'avis à publier:");
    console.log(JSON.stringify(reviewData, null, 2));
    
    // Envoi de la requête à l'API locale
    console.log("\n⏳ Envoi de la requête à l'API...");
    const response = await axios.post('http://localhost:5000/api/immediate-review', reviewData);
    
    console.log("\n✅ Réponse de l'API reçue:");
    console.log(JSON.stringify(response.data, null, 2));
    
    // Vérifier le statut de la revue après 10 secondes
    console.log("\n⏳ Attente de 10 secondes pour vérifier le statut de l'avis...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Récupérer l'avis créé
    const reviewId = response.data.review_id;
    const review = await storage.getReview(reviewId);
    
    if (review) {
      console.log("\n📊 Statut actuel de l'avis:");
      console.log(`- ID: ${review.id}`);
      console.log(`- Statut: ${review.status}`);
      console.log(`- Erreur: ${review.error || 'Aucune erreur'}`);
      console.log(`- Créé: ${review.createdAt}`);
      console.log(`- Publication prévue: ${review.postTime}`);
      
      // Vérifier si l'avis est toujours en attente, en cours, ou terminé
      if (review.status === 'pending' || review.status === 'in_progress') {
        console.log("\n⚠️ L'avis est encore en cours de traitement. Le système va continuer à tenter de le publier en arrière-plan.");
      } else if (review.status === 'completed') {
        console.log("\n🎉 L'avis a été publié avec succès!");
      } else if (review.status === 'retrying') {
        console.log("\n⚠️ L'avis est en cours de nouvelle tentative. Vérifiez les logs pour plus de détails.");
      } else if (review.status === 'failed') {
        console.log(`\n❌ Échec de la publication: ${review.error}`);
      }
    } else {
      console.log(`\n❌ Impossible de trouver l'avis avec l'ID ${reviewId}`);
    }
    
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    
    if (error.response) {
      console.error("Détails de l'erreur API:");
      console.error(`- Statut: ${error.response.status}`);
      console.error(`- Message: ${JSON.stringify(error.response.data)}`);
    }
  } finally {
    try {
      await closeDatabase();
    } catch (error) {
      // Ignorer l'erreur de fermeture
    }
  }
}

// Exécuter le test
testSingleReview().catch(console.error);