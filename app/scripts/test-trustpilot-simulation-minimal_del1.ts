/**
 * Test de publication d'un avis Trustpilot en mode simulation (version minimale)
 * 
 * Cette version simplifiée teste uniquement la simulation de publication d'un avis Trustpilot
 * en utilisant des IDs connus directement plutôt que de rechercher dans la base de données.
 */

import { db } from './server/db';
import { proxies, businesses, postingAccounts, reviews } from './shared/schema';
import { eq } from 'drizzle-orm';
import { AutomationService } from './server/services/automation.service';
import * as crypto from 'crypto';

// Fonction pour générer un ID unique pour chaque test
function generateUniqueId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Test de publication d'un avis Trustpilot en mode simulation
 */
async function testTrustpilotSimulation() {
  console.log("Démarrage du test de publication d'avis Trustpilot en mode simulation...");
  
  const testId = generateUniqueId();
  console.log(`ID de test: ${testId}`);
  
  // Initialiser les services nécessaires
  console.log("Initialisation du service d'automation...");
  const automationService = new AutomationService();
  
  try {
    // 1. Vérifier que les IDs existent
    console.log("Vérification des données de test...");
    
    // ID d'entreprise Trustpilot (à partir du test précédent)
    const businessId = 11;
    
    // Vérifier que l'entreprise existe
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    
    if (!business) {
      console.error(`Aucune entreprise trouvée avec l'ID ${businessId}!`);
      return;
    }
    
    console.log(`Entreprise trouvée: ${business.name} (ID: ${business.id})`);
    
    // ID de compte Trustpilot (à partir du test précédent)
    const accountId = 9;
    
    // Vérifier que le compte existe
    const [account] = await db.select().from(postingAccounts).where(eq(postingAccounts.id, accountId));
    
    if (!account) {
      console.error(`Aucun compte trouvé avec l'ID ${accountId}!`);
      return;
    }
    
    console.log(`Compte trouvé: ${account.email} (ID: ${account.id})`);
    
    // ID de proxy (à partir du test précédent)
    const proxyId = 6;
    
    // Vérifier que le proxy existe
    const [proxy] = await db.select().from(proxies).where(eq(proxies.id, proxyId));
    
    if (!proxy) {
      console.error(`Aucun proxy trouvé avec l'ID ${proxyId}!`);
      return;
    }
    
    console.log(`Proxy trouvé: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);
    
    // 2. Créer un avis de test
    console.log("Création d'un avis de test...");
    
    const reviewContent = `Test d'avis Trustpilot ${testId} - Excellent service! J'ai récemment utilisé cette plateforme et je suis très satisfait de l'expérience. L'interface est intuitive et le support client est réactif. Je recommande fortement.`;
    
    const reviewData = {
      businessId: business.id,
      content: reviewContent,
      rating: 5,
      status: 'pending',
      source: 'test',
      scheduledFor: new Date(),
      platform: 'trustpilot',
      author: account.email,
      reviewUrl: '',
      aiGenerated: true,
    };
    
    const [review] = await db.insert(reviews).values(reviewData).returning();
    console.log(`Avis créé avec ID: ${review.id}`);
    
    // 3. Enregistrer l'état initial
    const initialReviewCount = account.reviewCount || 0;
    const initialProxyLastUsed = proxy.lastUsed || null;
    
    console.log(`État initial - Compte: ${initialReviewCount} avis, Proxy: dernière utilisation ${initialProxyLastUsed}`);
    
    // 4. Lancer la publication en mode simulation pure
    console.log("Lancement de la publication en mode simulation pure...");
    
    const result = await automationService.processReviewImmediately({
      reviewId: review.id,
      businessId: business.id,
      accountId: account.id,
      proxyId: proxy.id,
      simulation_mode: true,
      skip_validation: true  // Option pour contourner la validation du proxy
    });
    
    console.log("Résultat:", JSON.stringify(result, null, 2));
    
    // 5. Vérifier l'état de l'avis après publication
    console.log("Vérification des mises à jour...");
    
    // Avis
    const [updatedReview] = await db.select().from(reviews).where(eq(reviews.id, review.id));
    
    if (updatedReview.status === 'posted') {
      console.log("✅ TEST RÉUSSI: L'avis a été marqué comme posté!");
    } else {
      console.log(`❌ TEST ÉCHOUÉ: L'avis a le statut "${updatedReview.status}" au lieu de "posted"`);
    }
    
    // Compte
    const [updatedAccount] = await db.select().from(postingAccounts).where(eq(postingAccounts.id, account.id));
    
    if (updatedAccount.reviewCount > initialReviewCount) {
      console.log(`✅ TEST RÉUSSI: Le nombre d'avis du compte a été incrémenté de ${initialReviewCount} à ${updatedAccount.reviewCount}!`);
    } else {
      console.log(`❌ TEST ÉCHOUÉ: Le nombre d'avis du compte n'a pas changé: ${updatedAccount.reviewCount}`);
    }
    
    // Proxy
    const [updatedProxy] = await db.select().from(proxies).where(eq(proxies.id, proxy.id));
    
    if (updatedProxy.lastUsed) {
      const initialDate = initialProxyLastUsed ? new Date(initialProxyLastUsed).getTime() : 0;
      const updatedDate = new Date(updatedProxy.lastUsed).getTime();
      
      if (updatedDate > initialDate) {
        console.log("✅ TEST RÉUSSI: La date de dernière utilisation du proxy a été mise à jour!");
      } else {
        console.log("❌ TEST ÉCHOUÉ: La date de dernière utilisation du proxy n'a pas été mise à jour");
      }
    }
    
    console.log("Test terminé!");
    
  } catch (error) {
    console.error("Erreur lors du test de publication d'avis Trustpilot:", error);
  }
}

// Exécution du test
testTrustpilotSimulation()
  .then(() => {
    console.log("Test terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur lors de l'exécution du test:", error);
    process.exit(1);
  });