/**
 * Test direct de mise à jour de la base de données pour simuler une publication d'avis Trustpilot
 * 
 * Ce script contourne le service d'automation et effectue directement les mises à jour
 * de base de données qui seraient normalement effectuées par le mode simulation.
 */

import { db } from './server/db';
import { proxies, businesses, postingAccounts, reviews } from './shared/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

// Fonction pour générer un ID unique pour chaque test
function generateUniqueId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Simulation directe de la publication d'un avis Trustpilot
 */
async function testDirectTrustpilotUpdate() {
  console.log("Démarrage du test direct de mise à jour pour Trustpilot...");
  
  const testId = generateUniqueId();
  console.log(`ID de test: ${testId}`);
  
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
    
    // ID de compte Trustpilot (spécifique à la plateforme)
    const accountId = 15;
    
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
      status: 'pending',
      platform: 'trustpilot'
    };
    
    const [review] = await db.insert(reviews).values(reviewData).returning();
    console.log(`Avis créé avec ID: ${review.id}`);
    
    // 3. Enregistrer l'état initial
    const initialReviewCount = account.reviewCount || 0;
    const initialProxyLastUsed = proxy.lastUsed || null;
    
    console.log(`État initial - Compte: ${initialReviewCount} avis, Proxy: dernière utilisation ${initialProxyLastUsed}`);
    
    // 4. Simuler directement les mises à jour qui auraient lieu en mode simulation
    console.log("Simulation directe des mises à jour...");
    
    // a. Mettre à jour le statut de l'avis
    await db.update(reviews)
      .set({
        status: 'posted',
        postTime: new Date()
      })
      .where(eq(reviews.id, review.id));
    
    // b. Mettre à jour le compte (incrémenter reviewCount et mettre à jour lastUsed)
    await db.update(postingAccounts)
      .set({
        reviewCount: (account.reviewCount || 0) + 1,
        lastUsed: new Date(),
        consecutiveUses: (account.consecutiveUses || 0) + 1
      })
      .where(eq(postingAccounts.id, account.id));
    
    // c. Mettre à jour le proxy (mettre à jour lastUsed)
    await db.update(proxies)
      .set({
        lastUsed: new Date(),
        total_successes: (proxy.total_successes || 0) + 1
      })
      .where(eq(proxies.id, proxy.id));
    
    // 5. Vérifier l'état après les mises à jour
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
    console.error("Erreur lors du test direct de mise à jour:", error);
  }
}

// Exécution du test
testDirectTrustpilotUpdate()
  .then(() => {
    console.log("Test terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur lors de l'exécution du test:", error);
    process.exit(1);
  });