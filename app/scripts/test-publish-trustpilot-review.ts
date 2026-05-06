/**
 * Script de test simplifié pour publier un avis sur Trustpilot
 * 
 * Ce script récupère une entreprise Trustpilot, un compte Trustpilot actif et un proxy,
 * puis génère et publie un avis en mode simulation.
 */

import * as schema from './shared/schema';
import { eq, and } from 'drizzle-orm';
import { AutomationService } from './server/services/automation.service';
import { ProxyService } from './server/services/proxy.service';
import { initializeDatabase, closeDatabase, db } from './server/db';

async function testPublishTrustpilotReview() {
  console.log("🚀 DÉMARRAGE DU TEST DE PUBLICATION D'AVIS TRUSTPILOT\n");

  try {
    // Initialiser la base de données
    console.log("⏳ Initialisation de la base de données...");
    await initializeDatabase();
    console.log("✅ Base de données initialisée\n");
    
    // Initialiser les services
    console.log("⏳ Initialisation des services...");
    const automationService = new AutomationService();
    console.log("✅ Services initialisés\n");

    // 1. Créer ou récupérer une entreprise Trustpilot de test
    console.log("⏳ Recherche d'une entreprise Trustpilot...");
    const businesses = await db.select().from(schema.businesses).where(eq(schema.businesses.type, 'Service')).limit(1);
    let business = businesses.length > 0 ? businesses[0] : null;

    if (!business) {
      console.log("⏳ Création d'une entreprise Trustpilot de test...");
      const [newBusiness] = await db.insert(schema.businesses).values({
        name: 'Trustpilot Test Business',
        type: 'Service',
        description: 'Business test pour Trustpilot',
        userId: 1,
        products: 'Services de test',
        keywords: 'test, trustpilot, review',
        websiteUrl: 'https://www.trustpilot.com',
      }).returning();
      
      business = newBusiness;
      console.log(`✅ Entreprise créée avec ID: ${business.id}`);
    } else {
      console.log(`✅ Entreprise trouvée avec ID: ${business.id}`);
    }

    // 2. Récupérer un compte Trustpilot actif
    console.log("\n⏳ Recherche d'un compte Trustpilot actif...");
    const accounts = await db.select().from(schema.postingAccounts).where(
      and(
        eq(schema.postingAccounts.platform, 'trustpilot'),
        eq(schema.postingAccounts.status, 'active')
      )
    ).limit(1);

    if (accounts.length === 0) {
      console.log("❌ Aucun compte Trustpilot actif trouvé!");
      return;
    }
    const account = accounts[0];
    console.log(`✅ Compte trouvé: ${account.email} (ID: ${account.id})`);

    // 3. Récupérer un proxy actif
    console.log("\n⏳ Recherche d'un proxy actif...");
    const proxies = await db.select().from(schema.proxies).where(
      eq(schema.proxies.status, 'active')
    ).limit(1);

    if (proxies.length === 0) {
      console.log("❌ Aucun proxy actif trouvé!");
      return;
    }
    const proxy = proxies[0];
    console.log(`✅ Proxy trouvé: ${proxy.host}:${proxy.port} (ID: ${proxy.id})`);

    // 4. Créer un avis dans la base de données
    console.log("\n⏳ Création d'un avis de test...");
    const reviewContent = `★★★★★ Excellent service! Une expérience très satisfaisante avec ${business.name}. L'interface utilisateur est intuitive et le support client est exceptionnel. Je recommande vivement leurs services à tous ceux qui cherchent une solution fiable et efficace.`;
    
    const [review] = await db.insert(schema.reviews).values({
      businessId: business.id,
      content: reviewContent,
      platform: 'trustpilot',
      status: 'pending',
      createdAt: new Date(),
      postingAccountId: account.id
    }).returning();
    
    console.log(`✅ Avis créé avec ID: ${review.id}`);

    // 5. Lancer la publication en mode simulation avec timeout
    console.log("\n⏳ Lancement de la publication en mode simulation (timeout 30s)...");
    
    // Créer une promesse avec timeout
    const runWithTimeout = async (timeoutMs = 30000) => {
      let timeoutId: NodeJS.Timeout;
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Opération expirée après ${timeoutMs}ms`));
        }, timeoutMs);
      });
      
      try {
        const resultPromise = automationService.processReviewImmediately({
          reviewId: review.id,
          businessId: business.id,
          accountId: account.id,
          proxyId: proxy.id,
          simulation_mode: true
        });
        
        return await Promise.race([resultPromise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    let result;
    try {
      result = await runWithTimeout();
    } catch (error) {
      console.log("\n⚠️ La publication a expiré, mais le processus continue en arrière-plan.");
      result = { success: false, message: "Timeout dépassé, mais le processus continue en arrière-plan" };
    }
    
    console.log("\n📊 Résultat de la publication:");
    console.log(JSON.stringify(result, null, 2));
    
    // 6. Vérifier l'état de l'avis après publication
    console.log("\n⏳ Vérification de l'état final de l'avis...");
    const updatedReviews = await db.select().from(schema.reviews).where(
      eq(schema.reviews.id, review.id)
    ).limit(1);
    
    const updatedReview = updatedReviews.length > 0 ? updatedReviews[0] : null;
    
    if (updatedReview) {
      console.log(`✅ Statut final de l'avis: ${updatedReview.status}`);
      
      if (updatedReview.status === 'posted') {
        console.log("🎉 TEST RÉUSSI: L'avis a été publié avec succès!");
      } else if (updatedReview.error) {
        console.log(`❌ TEST ÉCHOUÉ: Erreur lors de la publication: ${updatedReview.error}`);
      } else {
        console.log(`⚠️ TEST INCOMPLET: L'avis a le statut "${updatedReview.status}"`);
      }
    } else {
      console.log(`❌ Impossible de trouver l'avis avec l'ID ${review.id}`);
    }
    
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    // Fermer la connexion à la base de données
    await closeDatabase();
  }
}

// Exécution du script
testPublishTrustpilotReview()
  .then(() => {
    console.log("\n✅ Test terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur non gérée:", error);
    process.exit(1);
  });