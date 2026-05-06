/**
 * Script de test de publication réelle d'avis
 * 
 * Ce script teste le processus complet de publication réelle d'avis
 * en utilisant les comptes et proxies disponibles
 */

import { storage } from './server/storage';
import { realPostingService } from './server/services/real-posting.service';
import { proxyService } from './server/services/proxy.service';

// Configuration du test
const PLATFORM = 'google'; // Plateforme à tester ('google', 'trustpilot', 'tripadvisor')

// Fonction pour enregistrer les logs dans la console et un fichier
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
}

async function main() {
  try {
    log('🚀 Démarrage du test de publication réelle d\'avis');
    
    // 1. Récupérer une entreprise pour le test
    log('Recherche d\'une entreprise cible...');
    const businesses = await storage.getBusinesses();
    if (businesses.length === 0) {
      log('❌ Aucune entreprise trouvée dans la base de données');
      process.exit(1);
    }
    
    const business = businesses.find(b => b.platform === PLATFORM) || businesses[0];
    log(`✅ Entreprise sélectionnée: ${business.name} (ID: ${business.id})`);
    
    // 2. Récupérer un compte de publication compatible
    log(`Recherche d'un compte ${PLATFORM} actif...`);
    const accounts = await storage.getPostingAccountsByPlatform(PLATFORM);
    const activeAccounts = accounts.filter(a => a.status === 'active');
    
    if (activeAccounts.length === 0) {
      log(`❌ Aucun compte ${PLATFORM} actif trouvé`);
      process.exit(1);
    }
    
    const account = activeAccounts[0];
    log(`✅ Compte sélectionné: ${account.email} (ID: ${account.id})`);
    
    // 3. Récupérer un proxy compatible
    log('Recherche d\'un proxy actif...');
    let proxy;
    
    // Si le compte a un proxy préféré, l'utiliser
    if (account.proxyId) {
      proxy = await storage.getProxy(account.proxyId);
      if (proxy && proxy.status === 'active') {
        log(`✅ Proxy préféré du compte trouvé: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);
      }
    }
    
    // Sinon, chercher un proxy géographiquement compatible
    if (!proxy) {
      const proxies = await storage.getProxies();
      const activeProxies = proxies.filter(p => p.status === 'active');
      
      if (activeProxies.length === 0) {
        log('❌ Aucun proxy actif trouvé');
        process.exit(1);
      }
      
      // Vérifier la cohérence géographique si le compte a un pays défini
      if (account.country) {
        const compatibleProxies = activeProxies.filter(p => 
          p.country && p.country.toLowerCase() === account.country.toLowerCase()
        );
        
        if (compatibleProxies.length > 0) {
          proxy = compatibleProxies[0];
          log(`✅ Proxy géographiquement compatible trouvé: ${proxy.host}:${proxy.port} (pays: ${proxy.country})`);
        } else {
          log('⚠️ Aucun proxy géographiquement compatible trouvé. Utilisation d\'un proxy standard.');
          proxy = activeProxies[0];
        }
      } else {
        proxy = activeProxies[0];
        log(`✅ Proxy sélectionné: ${proxy.host}:${proxy.port}`);
      }
    }
    
    // 4. Création d'un avis de test
    log('Création d\'un avis de test...');
    const reviewContent = "Très bonne expérience, service rapide et personnel attentionné. Je recommande vivement cet établissement ! L'ambiance y est agréable et les prix sont raisonnables.";
    
    const review = await storage.createReview({
      businessId: business.id,
      content: reviewContent,
      title: "Excellente expérience",
      rating: 5,
      platform: PLATFORM,
      status: 'pending',
      postingAccountId: account.id,
      proxyId: proxy.id,
      isAnonymous: false
    });
    
    log(`✅ Avis créé avec ID: ${review.id}`);
    
    // 5. Test de publication réelle
    log('Lancement de la publication réelle...');
    try {
      const result = await realPostingService.publishReview(review.id);
      log(`🎉 Publication réussie: ${result}`);
    } catch (error) {
      log(`❌ Erreur lors de la publication: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 6. Vérification du statut final
    const updatedReview = await storage.getReview(review.id);
    log(`Statut final de l'avis: ${updatedReview?.status}`);
    
    if (updatedReview?.status === 'posted') {
      log('🎉 Test réussi: L\'avis a été publié avec succès !');
    } else {
      log(`❌ Test échoué: L'avis n'a pas pu être publié (statut: ${updatedReview?.status})`);
      if (updatedReview?.error) {
        log(`Message d'erreur: ${updatedReview.error}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    log(`❌ Erreur générale: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();