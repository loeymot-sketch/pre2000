/**
 * Test de simulation pure d'un avis sans initialisation de proxy
 * 
 * Ce test simule purement la publication d'un avis sans aucune
 * tentative de connexion à un proxy ou à une plateforme réelle.
 */

import { storage } from './server/storage';
import { Business, PostingAccount, Review } from './shared/schema';

/**
 * Génère un ID unique pour les tests
 */
function generateTestId() {
  return `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Simulation pure de la publication d'un avis
 */
async function simulateReviewPosting() {
  console.log('Démarrage de la simulation pure de publication d\'avis...');
  
  try {
    // 1. Créer un business de test
    console.log('Création d\'un business de test...');
    const business = await storage.createBusiness({
      name: 'Test Business Pure Simulation',
      url: 'https://www.trustpilot.com/review/doge-vision.com',
      platform: 'trustpilot',
      userId: 1,
      industry: 'Technology',
      location: 'Paris, France',
      description: 'Business de test pour simulation pure',
      rating_target: 4.5,
      review_goal: 10,
      status: 'active'
    });
    
    console.log(`Business créé avec ID: ${business.id}`);
    
    // 2. Créer un compte de test
    console.log('Création d\'un compte de test...');
    const account = await storage.createPostingAccount({
      platform: 'trustpilot',
      email: `test_${generateTestId()}@example.com`,
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User',
      status: 'active',
      creation_date: new Date(),
      last_used: null,
      consecutive_uses: 0,
      total_reviews: 0,
      risk_score: 0,
      verification_status: 'verified',
      login_successful: true
    });
    
    console.log(`Compte créé avec ID: ${account.id}`);
    
    // 3. Créer un avis de test
    console.log('Création d\'un avis de test...');
    const review = await storage.createReview({
      business_id: business.id,
      account_id: account.id,
      content: "Excellent service! Je recommande vivement cette entreprise pour son professionnalisme et la qualité de ses services. L'équipe est très réactive et à l'écoute des besoins des clients.",
      rating: 5,
      platform: 'trustpilot',
      status: 'pending',
      scheduled_date: new Date(),
      publish_date: null,
      test_id: generateTestId(),
      simulation_mode: true
    });
    
    console.log(`Avis créé avec ID: ${review.id}`);
    
    // 4. Simuler directement la publication sans passer par AutomationService
    console.log('Simulation pure de la publication...');
    
    // Mettre à jour directement l'avis comme s'il avait été publié
    const publishDate = new Date();
    await storage.updateReview(review.id, {
      status: 'posted',
      publish_date: publishDate,
      error: null
    });
    
    // Mettre à jour les statistiques du compte avec conversion en nombres
    const currentConsecutiveUses = typeof account.consecutive_uses === 'number' ? account.consecutive_uses : 0;
    const currentTotalReviews = typeof account.total_reviews === 'number' ? account.total_reviews : 0;
    
    await storage.updatePostingAccount(account.id, {
      last_used: publishDate,
      consecutive_uses: currentConsecutiveUses + 1,
      total_reviews: currentTotalReviews + 1
    });
    
    // 5. Vérifier les mises à jour
    const updatedReview = await storage.getReview(review.id);
    const updatedAccount = await storage.getPostingAccount(account.id);
    
    console.log(`✅ Statut final de l'avis: ${updatedReview.status}`);
    console.log(`✅ Date de publication: ${updatedReview.publish_date}`);
    console.log(`✅ Compte mis à jour - reviews: ${updatedAccount.total_reviews}, utilisations consécutives: ${updatedAccount.consecutive_uses}`);
    
    return {
      success: true,
      reviewId: review.id,
      accountId: account.id,
      businessId: business.id,
      message: 'Simulation pure réussie'
    };
  } catch (error) {
    console.error('Erreur lors de la simulation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Exécution du test
simulateReviewPosting()
  .then(result => {
    console.log('Résultat final:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  });