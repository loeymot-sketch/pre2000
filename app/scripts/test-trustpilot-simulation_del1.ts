/**
 * Test de publication d'un avis Trustpilot en mode simulation
 * 
 * Ce script teste la publication d'un avis Trustpilot en utilisant
 * notre mode de simulation pure qui ne lance pas de navigateur.
 */

import { db } from './server/db';
import { proxies, businesses, postingAccounts, reviews } from './shared/schema';
import { eq } from 'drizzle-orm';
import { AutomationService } from './server/services/automation.service';
import { AccountRotationService } from './server/services/account-rotation.service';
import { ProxyService } from './server/services/proxy.service';
import { AIService } from './server/services/ai.service';
import { ProxyConfigService } from './server/services/proxy-config.service';
import { SecurityManagerService } from './server/services/security-manager.service';
import { CleanupService } from './server/services/cleanup.service';
import { promises as fs } from 'fs';
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
  console.log("Initialisation des services...");
  
  const storage = db;
  const proxyConfigService = new ProxyConfigService();
  const proxyService = new ProxyService();
  const aiService = new AIService();
  const securityManagerService = new SecurityManagerService();
  const accountRotationService = new AccountRotationService();
  const cleanupService = new CleanupService();
  
  const automationService = new AutomationService();
  
  try {
    // 1. Récupérer une entreprise Trustpilot
    console.log("Récupération d'une entreprise Trustpilot...");
    const businessesResult = await db.select().from(businesses).where(eq(businesses.type, 'trustpilot')).limit(1);
    
    if (businessesResult.length === 0) {
      console.error("Aucune entreprise Trustpilot trouvée!");
      return;
    }
    
    const business = businessesResult[0];
    console.log(`Entreprise trouvée: ${business.name} (ID: ${business.id})`);
    
    // 2. Récupérer un compte Trustpilot
    console.log("Récupération d'un compte Trustpilot...");
    const accountsResult = await db.select().from(postingAccounts)
      .where(eq(postingAccounts.platform, 'trustpilot'))
      .where(eq(postingAccounts.status, 'active'))
      .limit(1);
    
    if (accountsResult.length === 0) {
      console.error("Aucun compte Trustpilot trouvé!");
      return;
    }
    
    const account = accountsResult[0];
    console.log(`Compte trouvé: ${account.email} (ID: ${account.id})`);
    
    // 3. Récupérer un proxy
    console.log("Récupération d'un proxy...");
    const proxiesResult = await db.select().from(proxies)
      .where(eq(proxies.status, 'active'))
      .limit(1);
    
    if (proxiesResult.length === 0) {
      console.error("Aucun proxy disponible!");
      return;
    }
    
    const proxy = proxiesResult[0];
    console.log(`Proxy trouvé: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);
    
    // 4. Générer un contenu d'avis
    console.log("Génération d'un contenu d'avis...");
    const reviewContent = `Test d'avis Trustpilot ${testId} - Excellent service! J'ai récemment utilisé cette plateforme et je suis très satisfait de l'expérience. L'interface est intuitive et le support client est réactif. Je recommande fortement.`;
    
    // 5. Créer l'avis dans la base de données
    console.log("Création de l'avis dans la base de données...");
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
    
    // 6. Lancer la publication en mode simulation
    console.log("Lancement de la publication en mode simulation...");
    
    const result = await automationService.processReviewImmediately({
      reviewId: review.id,
      businessId: business.id,
      accountId: account.id,
      proxyId: proxy.id,
      simulation_mode: true
    });
    
    console.log("Résultat de la publication:", result);
    
    // 7. Vérifier l'état de l'avis après publication
    console.log("Vérification de l'état de l'avis...");
    const [updatedReview] = await db.select().from(reviews).where(eq(reviews.id, review.id));
    
    if (updatedReview.status === 'posted') {
      console.log("✅ TEST RÉUSSI: L'avis a été marqué comme posté!");
    } else {
      console.log(`❌ TEST ÉCHOUÉ: L'avis a le statut "${updatedReview.status}" au lieu de "posted"`);
    }
    
    // 8. Vérifier les mises à jour du compte
    console.log("Vérification des mises à jour du compte...");
    const [updatedAccount] = await db.select().from(postingAccounts).where(eq(postingAccounts.id, account.id));
    
    if (updatedAccount.reviewCount > account.reviewCount) {
      console.log("✅ TEST RÉUSSI: Le nombre d'avis du compte a été incrémenté!");
    } else {
      console.log(`❌ TEST ÉCHOUÉ: Le nombre d'avis du compte n'a pas changé: ${updatedAccount.reviewCount}`);
    }
    
    // 9. Vérifier les mises à jour du proxy
    console.log("Vérification des mises à jour du proxy...");
    const [updatedProxy] = await db.select().from(proxies).where(eq(proxies.id, proxy.id));
    
    if (updatedProxy.lastUsed && new Date(updatedProxy.lastUsed) > new Date(proxy.lastUsed || 0)) {
      console.log("✅ TEST RÉUSSI: La date de dernière utilisation du proxy a été mise à jour!");
    } else {
      console.log("❌ TEST ÉCHOUÉ: La date de dernière utilisation du proxy n'a pas été mise à jour");
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