/**
 * Test simple pour la publication d'un avis Trustpilot en mode simulation
 * 
 * Ce script interagit directement avec le stockage et le service d'automatisation
 * pour tester le mode de simulation Trustpilot sans avoir besoin d'API HTTP.
 */

// Importer les dépendances nécessaires
import { promises as fs } from 'fs';
import { storage } from './server/storage';
import { AutomationService } from './server/services/automation.service';
import { Review } from './shared/schema';

// Fonction principale de test
async function testTrustpilotReview() {
  console.log('Début du test de publication Trustpilot en mode simulation...');
  
  try {
    // 1. D'abord, récupérons notre entreprise Trustpilot directement de la base de données
    console.log('Récupération des entreprises...');
    const businesses = await storage.getBusinesses();
    
    console.log(`Trouvé ${businesses.length} entreprises au total`);
    console.log('Types d\'entreprises disponibles:', businesses.map(b => b.type).join(', '));
    
    // Chercher une entreprise Trustpilot
    const trustpilotBusiness = businesses.find(b => b.type === 'trustpilot');
    
    // Vérification explicite
    console.log('Entreprises par type:');
    const businessTypes = {};
    businesses.forEach(b => {
      if (!businessTypes[b.type]) businessTypes[b.type] = [];
      businessTypes[b.type].push(b.name);
    });
    console.log(JSON.stringify(businessTypes, null, 2));
    
    if (!trustpilotBusiness) {
      throw new Error('Aucune entreprise Trustpilot trouvée!');
    }
    
    console.log(`Entreprise Trustpilot trouvée: ${trustpilotBusiness.name} (ID: ${trustpilotBusiness.id})`);
    
    // 2. Récupérer un compte Trustpilot directement de la base de données
    console.log('Récupération des comptes Trustpilot...');
    const accounts = await storage.getPostingAccountsByPlatform('trustpilot');
    
    if (!accounts || accounts.length === 0) {
      throw new Error('Aucun compte Trustpilot actif trouvé!');
    }
    
    // Filtrer pour un compte actif
    const activeAccounts = accounts.filter(a => a.status === 'active');
    
    if (activeAccounts.length === 0) {
      throw new Error('Aucun compte Trustpilot actif trouvé!');
    }
    
    const account = activeAccounts[0];
    console.log(`Compte Trustpilot trouvé: ${account.email} (ID: ${account.id})`);
    
    // 3. Récupérer un proxy actif directement de la base de données
    console.log('Récupération des proxies...');
    const proxies = await storage.getProxies();
    
    // Filtrer pour un proxy actif
    const activeProxies = proxies.filter(p => p.status === 'active');
    
    if (activeProxies.length === 0) {
      throw new Error('Aucun proxy actif trouvé!');
    }
    
    const proxy = activeProxies[0];
    console.log(`Proxy trouvé: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);
    
    // 4. Créer un contenu d'avis
    const reviewContent = `Test Trustpilot ${new Date().toISOString()} - Service excellent! Livraison rapide et produit de qualité. Le service client a été très réactif quand j'ai eu une question.`;
    
    // 5. Créer un avis dans la base de données
    console.log('Création de l\'avis dans la base de données...');
    const review = await storage.createReview({
      businessId: trustpilotBusiness.id,
      content: reviewContent,
      rating: 5,
      platform: 'trustpilot',
      status: 'pending',
      postingAccountId: account.id
    });
    
    console.log(`Avis créé avec l'ID: ${review.id}`);
    
    // 6. Initialiser le service d'automatisation
    console.log('Initialisation du service d\'automatisation...');
    const automationService = new AutomationService();
    
    // 7. Exécuter le processus de simulation
    console.log('Exécution du mode simulation...');
    const result = await automationService.processReviewImmediately(
      review,
      {
        simulation_mode: true,
        accountId: account.id,
        proxyId: proxy.id
      }
    );
    
    console.log('Résultat de la simulation:', result);
    
    if (result.success) {
      console.log('✅ TEST RÉUSSI: Avis Trustpilot publié avec succès en mode simulation!');
      
      // 8. Vérifier que l'avis a bien été mis à jour dans la base de données
      const updatedReview = await storage.getReview(review.id);
      console.log(`Statut final de l'avis: ${updatedReview.status}`);
      
      if (updatedReview.status === 'posted') {
        console.log('✅ Confirmation: le statut de l\'avis a bien été mis à jour dans la base de données');
        
        // 9. Vérifier que le compte a été mis à jour
        const updatedAccount = await storage.getPostingAccount(account.id);
        if (updatedAccount.reviewCount > account.reviewCount) {
          console.log('✅ Le nombre d\'avis du compte a été incrémenté');
        } else {
          console.log('❌ Le nombre d\'avis du compte n\'a pas été mis à jour');
        }
        
        // 10. Vérifier que le proxy a été mis à jour
        const updatedProxy = await storage.getProxy(proxy.id);
        if (updatedProxy.lastUsed && (!proxy.lastUsed || new Date(updatedProxy.lastUsed) > new Date(proxy.lastUsed))) {
          console.log('✅ La date de dernière utilisation du proxy a été mise à jour');
        } else {
          console.log('❌ La date de dernière utilisation du proxy n\'a pas été mise à jour');
        }
        
        return true;
      } else {
        console.log(`❌ Problème: l'avis a le statut "${updatedReview.status}" au lieu de "posted"`);
      }
    } else {
      console.log('❌ TEST ÉCHOUÉ: La simulation a échoué');
      console.log('Raison:', result.message || 'Inconnue');
    }
    
    return false;
  } catch (error) {
    console.error('Erreur lors du test:', error);
    return false;
  }
}

// Exécuter le test
testTrustpilotReview()
  .then(success => {
    console.log(`Test ${success ? 'réussi' : 'échoué'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });