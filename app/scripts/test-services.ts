/**
 * Script de test direct pour les services de publication réelle
 * 
 * Ce script contourne l'API Express et appelle directement les services backend
 * pour tester les fonctionnalités de publication réelle
 */

import { storage } from './server/storage';
import { realPostingService } from './server/services/real-posting.service';
import { enhancedHumanBehaviorService } from './server/services/enhanced-human-behavior.service';

async function main() {
  try {
    console.log('Démarrage du test des services de publication réelle...');
    
    // 1. Récupérer les données nécessaires
    console.log('Récupération des entreprises...');
    const businesses = await storage.getBusinesses();
    if (businesses.length === 0) {
      console.error('Aucune entreprise trouvée');
      process.exit(1);
    }
    console.log(`${businesses.length} entreprises trouvées`);
    
    console.log('Récupération des comptes de publication...');
    const accounts = await storage.getPostingAccounts();
    if (accounts.length === 0) {
      console.error('Aucun compte de publication trouvé');
      process.exit(1);
    }
    console.log(`${accounts.length} comptes trouvés`);
    
    // Filtrer les comptes actifs Google
    const googleAccounts = accounts.filter(a => a.platform === 'google' && a.status === 'active');
    console.log(`${googleAccounts.length} comptes Google actifs trouvés`);
    
    if (googleAccounts.length === 0) {
      console.error('Aucun compte Google actif disponible');
      process.exit(1);
    }
    
    console.log('Récupération des proxies...');
    const proxies = await storage.getProxies();
    if (proxies.length === 0) {
      console.error('Aucun proxy trouvé');
      process.exit(1);
    }
    console.log(`${proxies.length} proxies trouvés`);
    
    // Filtrer les proxies actifs
    const activeProxies = proxies.filter(p => p.status === 'active');
    console.log(`${activeProxies.length} proxies actifs trouvés`);
    
    if (activeProxies.length === 0) {
      console.error('Aucun proxy actif disponible');
      process.exit(1);
    }
    
    // 2. Sélectionner une entreprise, un compte et un proxy pour le test
    const business = businesses[0];
    const account = googleAccounts[0];
    const proxy = activeProxies[0];
    
    console.log(`\nEntreprise sélectionnée: ${business.name} (ID: ${business.id})`);
    console.log(`Compte sélectionné: ${account.email} (ID: ${account.id})`);
    console.log(`Proxy sélectionné: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);
    
    // 3. Créer un avis de test
    console.log('\nCréation d\'un avis de test...');
    const reviewData = {
      businessId: business.id,
      content: 'Ceci est un avis de test généré automatiquement pour vérifier la fonctionnalité de publication réelle.',
      title: 'Test de publication réelle',
      rating: 5,
      platform: 'google',
      status: 'pending',
      postingAccountId: account.id,
      proxyId: proxy.id,
      isAnonymous: false
    };
    
    const review = await storage.createReview(reviewData);
    console.log(`Avis créé avec ID: ${review.id}`);
    
    // 4. Lancer la publication réelle
    console.log('\nLancement de la publication réelle...');
    try {
      const result = await realPostingService.publishReview(review.id);
      console.log(`Résultat de la publication: ${result ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
    }
    
    // 5. Vérifier l'état de l'avis après publication
    const updatedReview = await storage.getReview(review.id);
    console.log(`\nStatut de l'avis après tentative de publication: ${updatedReview?.status}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur générale lors du test:', error);
    process.exit(1);
  }
}

main();