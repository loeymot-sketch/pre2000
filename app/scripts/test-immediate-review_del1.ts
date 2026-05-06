/**
 * Script de test pour la publication immédiate d'un avis
 * 
 * Ce script utilise l'API /api/immediate-review pour publier un avis de test
 * en utilisant les proxies BrightData correctement configurés
 */

import axios from 'axios';

async function testImmediateReviewPosting() {
  console.log("=== TEST DE PUBLICATION IMMÉDIATE D'AVIS ===");
  console.log("Date et heure: " + new Date().toLocaleString());
  
  try {
    // Récupérer la liste des entreprises via l'API
    console.log("\n1. Récupération des entreprises...");
    const businessesResponse = await axios.get('http://localhost:5000/api/businesses');
    const businesses = businessesResponse.data;
    
    if (businesses.length === 0) {
      throw new Error("Aucune entreprise trouvée dans la base de données");
    }
    
    // Utiliser la première entreprise comme cible de test
    const business = businesses[0];
    console.log(`Entreprise sélectionnée pour le test: ${business.name} (ID: ${business.id})`);
    
    // Récupérer la liste des proxies actifs via l'API
    console.log("\n2. Récupération des proxies...");
    const proxiesResponse = await axios.get('http://localhost:5000/api/proxies');
    const proxies = proxiesResponse.data;
    
    // Récupérer la liste des comptes via l'API
    console.log("\n3. Récupération des comptes...");
    const accountsResponse = await axios.get('http://localhost:5000/api/posting-accounts');
    const accounts = accountsResponse.data;
    
    // Filtrer les comptes actifs et Google
    const activeGoogleAccounts = accounts.filter(
      account => account.status === 'active' && account.platform === 'google'
    );
    
    // Créer un avis de test
    console.log("\n4. Création d'un avis de test...");
    const testReview = {
      businessId: business.id,
      content: "Service exceptionnel ! J'ai été impressionné par la qualité de l'accompagnement et la réactivité de l'équipe. Je recommande vivement cette entreprise pour son professionnalisme et son attention aux détails.",
      rating: 5,
      platform: "google",
      title: "Une expérience client exceptionnelle",
      author: "Utilisateur Test",
      postImmediately: true
    };
    
    // Ajouter l'ID de compte si disponible
    if (activeGoogleAccounts.length > 0) {
      testReview.accountId = activeGoogleAccounts[0].id;
      console.log(`Compte sélectionné: ${activeGoogleAccounts[0].email} (ID: ${activeGoogleAccounts[0].id})`);
    } else {
      console.log("Aucun compte Google actif trouvé, utilisation du mode sans compte spécifique");
    }
    
    // Ajouter l'ID de proxy si disponible
    if (proxies.length > 0) {
      const activeProxies = proxies.filter(proxy => proxy.status === 'active');
      if (activeProxies.length > 0) {
        testReview.proxyId = activeProxies[0].id;
        console.log(`Proxy sélectionné: ${activeProxies[0].host}:${activeProxies[0].port} (ID: ${activeProxies[0].id})`);
      } else {
        console.log("Aucun proxy actif trouvé, le système utilisera la sélection automatique");
      }
    } else {
      console.log("Aucun proxy trouvé");
    }
    
    console.log("\nDétails de l'avis à publier :");
    console.log(JSON.stringify(testReview, null, 2));
    
    // Publier l'avis via l'API
    console.log("\n5. Publication de l'avis...");
    const response = await axios.post('http://localhost:5000/api/immediate-review', testReview);
    
    console.log("\nRéponse du serveur :");
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log("\n✅ TEST RÉUSSI ! L'avis a été traité avec succès.");
    } else {
      console.log("\n❌ ÉCHEC DU TEST. L'avis n'a pas pu être publié.");
      console.log(`Erreur: ${response.data.message || "Aucun message d'erreur"}`);
    }
    
  } catch (error) {
    console.error("\n❌ ERREUR LORS DU TEST:");
    if (error.response) {
      console.error(`Statut HTTP: ${error.response.status}`);
      console.error("Réponse du serveur:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
  
  console.log("\n=== FIN DU TEST ===");
}

// Exécuter le test
testImmediateReviewPosting();