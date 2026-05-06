/**
 * Script pour tester la génération et la publication d'avis sur toutes les plateformes
 * 
 * Ce script génère et publie 5 avis sur chacune des plateformes disponibles (Google, Trustpilot, TripAdvisor)
 * en utilisant des comptes actifs et des proxies fonctionnels.
 */

import { AutomationService } from './server/services/automation.service';
import { AIService } from './server/services/ai.service';
import { PgStorage } from './server/pg-storage';

async function main() {
  try {
    console.log("Démarrage des tests de génération et publication multi-plateformes");
    
    // Initialiser les services
    const storage = new PgStorage();
    const aiService = new AIService();
    const automationService = new AutomationService();
    
    // Récupérer les comptes actifs par plateforme
    const accounts = await storage.getPostingAccounts();
    const activeAccounts = accounts.filter(a => a.status === 'active');
    
    console.log(`Nombre total de comptes actifs: ${activeAccounts.length}`);
    
    // Grouper les comptes par plateforme
    const accountsByPlatform: Record<string, typeof activeAccounts> = {
      google: activeAccounts.filter(a => a.platform === 'google'),
      trustpilot: activeAccounts.filter(a => a.platform === 'trustpilot'),
      tripadvisor: activeAccounts.filter(a => a.platform === 'tripadvisor')
    };
    
    // Afficher les statistiques des comptes
    for (const [platform, platformAccounts] of Object.entries(accountsByPlatform)) {
      console.log(`Plateforme ${platform}: ${platformAccounts.length} comptes actifs`);
    }
    
    // Récupérer les proxies actifs
    const proxies = await storage.getProxies();
    const activeProxies = proxies.filter(p => p.status === 'active');
    
    console.log(`Nombre total de proxies actifs: ${activeProxies.length}`);
    
    // Récupérer les business pour les tests
    const businesses = await storage.getBusinesses();
    if (businesses.length === 0) {
      throw new Error("Aucun business disponible pour les tests");
    }
    
    console.log(`Nombre de business disponibles: ${businesses.length}`);
    
    // Sélectionner le business pour les tests
    const testBusiness = businesses[0];
    console.log(`Business sélectionné pour les tests: ${testBusiness.name} (ID: ${testBusiness.id})`);
    
    // Plateformes à tester
    const platforms = ['google', 'trustpilot', 'tripadvisor'];
    
    // Nombre d'avis à générer par plateforme
    const reviewsPerPlatform = 5;
    
    // Générer et publier des avis pour chaque plateforme
    for (const platform of platforms) {
      console.log(`\n=== Tests pour la plateforme ${platform.toUpperCase()} ===`);
      
      // Vérifier si nous avons des comptes et des proxies pour cette plateforme
      if (accountsByPlatform[platform].length === 0) {
        console.log(`Aucun compte actif pour la plateforme ${platform}, test impossible`);
        continue;
      }
      
      // Générer les avis avec l'API OpenAI
      console.log(`Génération de ${reviewsPerPlatform} avis pour ${platform}...`);
      const reviews = await aiService.generateReviews(testBusiness, reviewsPerPlatform);
      console.log(`Avis générés avec succès pour ${platform}`);
      
      // Pour chaque avis, le publier avec un compte actif
      for (let i = 0; i < reviews.length; i++) {
        const reviewContent = reviews[i];
        console.log(`\nPublication de l'avis ${i+1}/${reviewsPerPlatform} sur ${platform}:`);
        console.log(`Contenu: "${reviewContent.substring(0, 50)}..."`);
        
        // Sélectionner un compte pour la publication
        const accountIndex = i % accountsByPlatform[platform].length;
        const selectedAccount = accountsByPlatform[platform][accountIndex];
        
        // Sélectionner un proxy pour la publication
        const proxyIndex = i % activeProxies.length;
        const selectedProxy = activeProxies[proxyIndex];
        
        console.log(`Compte sélectionné: ${selectedAccount.email} (ID: ${selectedAccount.id})`);
        console.log(`Proxy sélectionné: ${selectedProxy.host}:${selectedProxy.port} (ID: ${selectedProxy.id})`);
        
        try {
          // Créer l'avis dans la base de données
          const review = {
            businessId: testBusiness.id,
            content: reviewContent,
            platform,
            rating: 5,
            status: 'pending',
            title: `Test avis ${platform} #${i+1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            scheduledDate: null
          };
          
          // Stocker l'avis
          const savedReview = await storage.createReview(review);
          console.log(`Avis créé avec l'ID: ${savedReview.id}`);
          
          // Publier l'avis
          console.log(`Tentative de publication directe...`);
          const result = await automationService.processReviewImmediately(
            savedReview,
            {
              realPosting: true,
              detailedLogs: true,
              accountId: selectedAccount.id,
              proxyId: selectedProxy.id
            }
          );
          
          // Afficher le résultat
          if (result.success) {
            console.log(`✅ Publication réussie pour l'avis ${savedReview.id} sur ${platform}`);
          } else {
            console.log(`❌ Échec de la publication pour l'avis ${savedReview.id} sur ${platform}`);
            console.log(`Raison: ${result.message || "Inconnue"}`);
          }
          
          // Attendre un peu entre chaque publication pour éviter les détections
          console.log("Pause de 5 secondes avant la prochaine publication...");
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.error(`Erreur lors de la publication:`, error);
        }
      }
    }
    
    console.log("\n=== Tests multi-plateformes terminés ===");
    console.log("Visitez le Dashboard de l'application pour voir les résultats détaillés");
    
  } catch (error) {
    console.error("Erreur lors de l'exécution des tests:", error);
  } finally {
    // Terminer le processus
    process.exit(0);
  }
}

main();