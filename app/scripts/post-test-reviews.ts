/**
 * Script pour publier quelques avis de test sans dépendre de l'API OpenAI
 * 
 * Ce script publie un avis sur chaque plateforme en utilisant des avis prédéfinis
 * qui sont normalement des fallbacks lorsque l'API OpenAI n'est pas disponible.
 */

import { AutomationService } from './server/services/automation.service';
import { PgStorage } from './server/pg-storage';

// Avis prédéfinis par plateforme (pour éviter d'utiliser l'API OpenAI)
const PREDEFINED_REVIEWS = {
  google: [
    "J'ai adoré mon expérience! Le service était impeccable et les produits de qualité. Je recommande vivement à tous mes amis.",
    "Excellente expérience de bout en bout. Le service client est exceptionnel et les produits sont d'une qualité remarquable. Je reviendrai sans hésiter.",
    "Super endroit avec une ambiance chaleureuse. Service rapide et efficace. Les produits sont de grande qualité et valent vraiment le prix."
  ],
  trustpilot: [
    "Service client exceptionnellement réactif et professionnel. Ma commande est arrivée rapidement et conforme à mes attentes. Je suis pleinement satisfait.",
    "Une entreprise fiable et professionnelle qui tient ses promesses. Je recommande vivement leurs services pour leur qualité et leur rigueur.",
    "Première commande et je suis agréablement surpris par la qualité du service. Communication claire, livraison rapide et produit conforme. Je recommande!"
  ],
  tripadvisor: [
    "Notre séjour a été parfait! Chambres propres, personnel accueillant et petit-déjeuner délicieux. L'emplacement est idéal pour visiter les attractions principales.",
    "Un endroit magnifique avec un service attentionné. La nourriture était délicieuse et variée. Je recommande particulièrement les spécialités locales.",
    "Une expérience inoubliable! Tout était parfait, de l'accueil jusqu'au départ. Le rapport qualité-prix est excellent et justifie amplement les 5 étoiles."
  ]
};

async function main() {
  try {
    console.log("Démarrage du test de publication d'avis prédéfinis");
    
    // Initialiser les services
    const storage = new PgStorage();
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
    
    // Publier un avis sur chaque plateforme
    for (const platform of platforms) {
      console.log(`\n=== Test pour la plateforme ${platform.toUpperCase()} ===`);
      
      // Vérifier si nous avons des comptes pour cette plateforme
      if (accountsByPlatform[platform].length === 0) {
        console.log(`Aucun compte actif pour la plateforme ${platform}, test impossible`);
        continue;
      }
      
      // Sélectionner un avis prédéfini
      const reviewContent = PREDEFINED_REVIEWS[platform][Math.floor(Math.random() * PREDEFINED_REVIEWS[platform].length)];
      console.log(`Avis sélectionné: "${reviewContent.substring(0, 50)}..."`);
      
      // Sélectionner un compte pour la publication
      const selectedAccount = accountsByPlatform[platform][0];
      
      // Sélectionner un proxy pour la publication
      const selectedProxy = activeProxies.length > 0 ? activeProxies[0] : null;
      
      if (!selectedProxy) {
        console.log("Aucun proxy actif disponible, impossible de continuer");
        continue;
      }
      
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
          title: `Test avis ${platform} (prédéfini)`,
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
        
      } catch (error) {
        console.error(`Erreur lors de la publication:`, error);
      }
    }
    
    console.log("\n=== Tests terminés ===");
    console.log("Visitez le Dashboard de l'application pour voir les résultats détaillés");
    
  } catch (error) {
    console.error("Erreur lors de l'exécution des tests:", error);
  } finally {
    process.exit(0);
  }
}

main();