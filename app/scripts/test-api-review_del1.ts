/**
 * Test simple de publication d'un avis via l'API
 */

import axios from 'axios';
import * as fs from 'fs';

async function testApiReview() {
  console.log("🚀 TEST DE PUBLICATION D'AVIS VIA L'API");
  
  try {
    // 1. Récupérer un business existant
    console.log("\n🔍 Récupération des businesses existants...");
    const businessesResponse = await axios.get('http://localhost:5000/api/businesses');
    const businesses = businessesResponse.data;
    
    if (businesses.length === 0) {
      throw new Error("Aucun business trouvé");
    }
    
    const business = businesses[0];
    console.log(`\n✅ Business sélectionné: ${business.name} (ID: ${business.id})`);
    
    // 2. Récupérer un compte Google
    console.log("\n🔍 Récupération des comptes Google...");
    const accountsResponse = await axios.get('http://localhost:5000/api/posting-accounts');
    const accounts = accountsResponse.data.filter((account: any) => account.platform === 'google' && account.status === 'active');
    
    if (accounts.length === 0) {
      throw new Error("Aucun compte Google actif trouvé");
    }
    
    const account = accounts[0];
    console.log(`\n✅ Compte sélectionné: ${account.email} (ID: ${account.id})`);
    
    // 3. Créer un avis
    console.log("\n🔍 Création d'un nouvel avis...");
    const reviewContent = `★★★★★ Test de l'amélioration de détection des champs.
    Service exceptionnel! L'équipe est professionnelle et réactive.
    Je recommande vivement ce service à tous ceux qui recherchent qualité et fiabilité.
    Test effectué le ${new Date().toLocaleString()}.`;
    
    const newReviewResponse = await axios.post('http://localhost:5000/api/reviews', {
      businessId: business.id,
      content: reviewContent,
      platform: 'google',
      postingAccountId: account.id
    });
    
    const newReview = newReviewResponse.data;
    console.log(`\n✅ Nouvel avis créé avec ID: ${newReview.id}`);
    
    // 4. Demander la publication immédiate
    console.log("\n🔍 Demande de publication immédiate...");
    const immediateResponse = await axios.post('http://localhost:5000/api/immediate-review', {
      reviewId: newReview.id,
      businessId: business.id,
      content: reviewContent,
      platform: 'google',
      postingAccountId: account.id
    });
    
    console.log(`\n📊 Résultat de la tentative: ${JSON.stringify(immediateResponse.data)}`);
    
    // 5. Vérifier le statut après quelques secondes
    console.log("\n⏳ Attente de 3 secondes pour vérifier le statut...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await axios.get(`http://localhost:5000/api/reviews/${newReview.id}`);
    const updatedReview = statusResponse.data;
    
    console.log(`\n📊 Statut final: ${updatedReview.status}`);
    if (updatedReview.error) {
      console.log(`\n❌ Erreur: ${updatedReview.error}`);
    }
    
    // Sauvegarder le résultat dans un fichier journal
    const logContent = {
      timestamp: new Date().toISOString(),
      business: business,
      account: account,
      review: updatedReview,
      success: updatedReview.status === 'published',
      error: updatedReview.error
    };
    
    fs.writeFileSync('api-review-test-result.json', JSON.stringify(logContent, null, 2));
    console.log("\n✅ Résultat sauvegardé dans api-review-test-result.json");
    
  } catch (error) {
    console.error(`\n❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    if (axios.isAxiosError(error) && error.response) {
      console.error(`\n📊 Détails: ${JSON.stringify(error.response.data)}`);
    }
  }
}

testApiReview()
  .catch(err => {
    console.error(`\n❌ Erreur critique: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  })
  .finally(() => {
    console.log("\n✅ Test terminé");
  });