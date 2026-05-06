/**
 * Test minimal pour vérifier la simulation d'un avis sur Trustpilot
 * avec les proxies BrightData
 */

import { storage } from './server/storage';
import { AutomationService } from './server/services/automation.service';
import { ProxyService } from './server/services/proxy.service';

/**
 * Génère un ID unique pour les tests
 */
function generateTestId() {
  return `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Test minimal de simulation Trustpilot
 */
async function testMinimalSimulation() {
  console.log('Démarrage du test minimal de simulation...');
  
  try {
    // 1. Créer un business de test si nécessaire
    console.log('Création d\'un business de test...');
    const business = await storage.createBusiness({
      name: 'Test Business Minimal',
      url: 'https://www.trustpilot.com/review/doge-vision.com',
      platform: 'trustpilot',
      userId: 1,
      industry: 'Technology',
      location: 'Paris, France',
      description: 'Business de test minimal',
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
    
    // 3. Créer un avis de test avec contenu prédéfini
    console.log('Création d\'un avis de test...');
    const review = await storage.createReview({
      business_id: business.id,
      account_id: account.id,
      content: "Excellent service! J'ai vraiment apprécié la rapidité et la qualité du travail. L'équipe est professionnelle et à l'écoute des besoins des clients. Je recommande vivement cette entreprise pour tous vos projets.",
      rating: 5,
      platform: 'trustpilot',
      status: 'pending',
      scheduled_date: new Date(),
      publish_date: null,
      test_id: generateTestId(),
      simulation_mode: true
    });
    
    console.log(`Avis créé avec ID: ${review.id}`);
    
    // 4. Lancer la simulation avec délai d'attente réduit
    console.log('Lancement de la simulation...');
    
    const automationService = new AutomationService();
    const result = await automationService.processReviewImmediately(review, {
      simulation_mode: true,
      minimal_resources: true,
      fast_mode: true,
      timeout_multiplier: 0.2, // Réduit les délais d'attente à 20%
      accountId: account.id,
      skip_screenshots: true
    });
    
    console.log('Résultat de la simulation:', result);
    
    // 5. Vérifier le statut de l'avis
    const updatedReview = await storage.getReview(review.id);
    
    if (updatedReview?.status === 'posted') {
      console.log('✅ TEST RÉUSSI: L\'avis a été publié avec succès en simulation!');
      return {
        success: true,
        reviewId: review.id,
        message: 'Test de simulation minimal réussi'
      };
    } else {
      console.log(`❌ TEST ÉCHOUÉ: Statut final = ${updatedReview?.status || 'inconnu'}`);
      return {
        success: false,
        reviewId: review.id,
        status: updatedReview?.status,
        error: updatedReview?.error || 'Échec de la simulation'
      };
    }
  } catch (error) {
    console.error('Erreur lors du test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Exécution du test
testMinimalSimulation()
  .then(result => {
    console.log('Résultat final:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  });