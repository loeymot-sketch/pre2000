/**
 * Script de test pour la publication d'un avis via l'API
 */

import axios from 'axios';

async function testReviewPosting() {
  try {
    console.log("Test de publication d'un avis via l'API...");
    
    // Récupérer la liste des entreprises
    console.log("Récupération des entreprises...");
    const businessesResponse = await axios.get('http://localhost:5000/api/businesses');
    const businesses = businessesResponse.data;
    
    if (businesses.length === 0) {
      throw new Error("Aucune entreprise trouvée dans la base de données");
    }
    
    // Utiliser la première entreprise comme cible de test
    const testBusiness = businesses[0];
    console.log(`Entreprise sélectionnée pour le test: ${testBusiness.name} (ID: ${testBusiness.id})`);
    
    // Créer un avis de test
    const testReview = {
      businessId: testBusiness.id,
      content: "Excellent service, je recommande vivement ! L'équipe est professionnelle et attentive aux besoins des clients. Une expérience très positive du début à la fin.",
      rating: 5,
      platform: "google", // Utiliser une plateforme supportée
      title: "Service exceptionnel",
      author: "Test Utilisateur",
      postImmediately: true
    };
    
    console.log("\nDétails de l'avis à publier :");
    console.log(JSON.stringify(testReview, null, 2));
    
    // Publier l'avis via l'API
    console.log("\nPublication de l'avis...");
    const response = await axios.post('http://localhost:5000/api/immediate-review', testReview);
    
    console.log("\nRéponse du serveur :");
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log("\n✅ Test réussi ! L'avis a été publié avec succès.");
    } else {
      console.log("\n❌ Échec du test. L'avis n'a pas pu être publié.");
      console.log(`Erreur: ${response.data.message || "Aucun message d'erreur"}`);
    }
  } catch (error) {
    console.error("\n❌ Erreur lors du test :");
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      console.error("Réponse:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Exécuter le test
testReviewPosting();