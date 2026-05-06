/**
 * Test complet de publication d'un avis Trustpilot en mode simulation
 * avec les proxies BrightData correctement configurés
 * 
 * Ce script teste la publication d'un avis Trustpilot en utilisant
 * notre mode de simulation pure qui ne lance pas de navigateur.
 */

import { storage } from './server/storage';
import { logger } from './server/services/logger.service';
import { AutomationService } from './server/services/automation.service';
import { ProxyService } from './server/services/proxy.service';
import { Business, PostingAccount, Review } from './shared/schema';
import { accountRotationService } from './server/services/account-rotation.service';
import { AIService } from './server/services/ai.service';

// Générer un ID unique pour le test
function generateUniqueId() {
  return `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Crée ou récupère une entreprise de test pour Trustpilot
 */
async function getOrCreateTestBusiness(): Promise<Business> {
  console.log('Recherche ou création d\'une entreprise de test pour Trustpilot...');
  
  // Rechercher une entreprise Trustpilot existante
  const businesses = await storage.getBusinesses();
  const trustpilotBusiness = businesses.find(b => b.platform === 'trustpilot');
  
  if (trustpilotBusiness) {
    console.log(`Entreprise Trustpilot existante trouvée: ${trustpilotBusiness.name} (ID: ${trustpilotBusiness.id})`);
    return trustpilotBusiness;
  }
  
  // Créer une nouvelle entreprise pour Trustpilot
  console.log('Aucune entreprise Trustpilot trouvée, création d\'une nouvelle...');
  
  const newBusiness = await storage.createBusiness({
    name: 'Test Business Trustpilot',
    url: 'https://www.trustpilot.com/review/doge-vision.com',
    platform: 'trustpilot',
    userId: 1, // Utilisateur par défaut
    industry: 'Technology',
    location: 'Paris, France',
    description: 'Entreprise de test pour Trustpilot',
    rating_target: 4.5,
    review_goal: 50,
    status: 'active'
  });
  
  console.log(`Nouvelle entreprise Trustpilot créée: ${newBusiness.name} (ID: ${newBusiness.id})`);
  return newBusiness;
}

/**
 * Crée ou récupère un compte de test pour Trustpilot
 */
async function getOrCreateTestAccount(): Promise<PostingAccount> {
  console.log('Recherche ou création d\'un compte de test pour Trustpilot...');
  
  // Rechercher un compte Trustpilot existant
  const accounts = await storage.getPostingAccountsByPlatform('trustpilot');
  
  if (accounts.length > 0) {
    console.log(`Compte Trustpilot existant trouvé: ${accounts[0].email} (ID: ${accounts[0].id})`);
    return accounts[0];
  }
  
  // Créer un nouveau compte pour Trustpilot
  console.log('Aucun compte Trustpilot trouvé, création d\'un nouveau...');
  
  const newAccount = await storage.createPostingAccount({
    platform: 'trustpilot',
    email: `test_${generateUniqueId()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Jean',
    last_name: 'Dupont',
    status: 'active',
    creation_date: new Date(),
    last_used: null,
    consecutive_uses: 0,
    total_reviews: 0,
    risk_score: 0,
    verification_status: 'verified',
    login_successful: true
  });
  
  console.log(`Nouveau compte Trustpilot créé: ${newAccount.email} (ID: ${newAccount.id})`);
  return newAccount;
}

/**
 * Génère un avis pour Trustpilot avec l'API OpenAI
 */
async function generateReview(business: Business): Promise<string> {
  console.log('Génération d\'un avis avec l\'API OpenAI...');
  
  try {
    const aiService = new AIService();
    const reviews = await aiService.generateReviews(business, 1);
    
    if (reviews && reviews.length > 0) {
      console.log('Avis généré avec succès:', reviews[0].substring(0, 50) + '...');
      return reviews[0];
    } else {
      throw new Error('Aucun avis généré');
    }
  } catch (error) {
    console.error('Erreur lors de la génération de l\'avis:', error);
    // Fallback en cas d'erreur
    return `Excellent service de ${business.name}. J'ai été impressionné par la qualité et le professionnalisme. Je recommande vivement à tous ceux qui cherchent une solution fiable et efficace dans ce domaine. L'équipe est très réactive et à l'écoute des besoins des clients.`;
  }
}

/**
 * Test de publication d'un avis Trustpilot en mode simulation
 */
async function testTrustpilotSimulation() {
  console.log('Démarrage du test de simulation Trustpilot...');
  
  try {
    // 1. Obtenir ou créer une entreprise de test
    const business = await getOrCreateTestBusiness();
    
    // 2. Obtenir ou créer un compte de test
    const account = await getOrCreateTestAccount();
    
    // 3. Générer un avis
    const reviewContent = await generateReview(business);
    
    // 4. Créer un objet review dans la base de données
    const review = await storage.createReview({
      business_id: business.id,
      account_id: account.id,
      content: reviewContent,
      rating: 5,
      platform: 'trustpilot',
      status: 'pending',
      scheduled_date: new Date(),
      publish_date: null,
      test_id: generateUniqueId(),
      simulation_mode: true
    });
    
    console.log(`Avis créé avec ID ${review.id}, démarrage de la simulation...`);
    
    // 5. Initialiser le service d'automation
    const automationService = new AutomationService();
    
    // 6. Publier l'avis en mode simulation
    console.log('Publication de l\'avis en mode simulation...');
    
    const result = await automationService.processReviewImmediately(review, {
      simulation_mode: true, // Crucial pour le test
      fast_mode: true,
      accountId: account.id
    });
    
    console.log('Résultat de la simulation:', result);
    
    // 7. Vérifier le statut de l'avis après la simulation
    const updatedReview = await storage.getReview(review.id);
    
    console.log(`Status final de l'avis: ${updatedReview?.status}`);
    console.log(`Date de publication simulée: ${updatedReview?.publish_date}`);
    
    if (updatedReview?.status === 'posted') {
      console.log('✅ TEST RÉUSSI: L\'avis a été simulé avec succès!');
      return {
        success: true,
        reviewId: review.id,
        status: updatedReview.status
      };
    } else {
      console.log('❌ TEST ÉCHOUÉ: La simulation n\'a pas mis à jour correctement le statut de l\'avis.');
      return {
        success: false,
        reviewId: review.id,
        status: updatedReview?.status || 'unknown',
        error: updatedReview?.error || 'Statut non mis à jour'
      };
    }
  } catch (error) {
    console.error('Erreur lors du test de simulation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Exécution du test
testTrustpilotSimulation()
  .then(result => {
    console.log('Résultat final du test:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  });