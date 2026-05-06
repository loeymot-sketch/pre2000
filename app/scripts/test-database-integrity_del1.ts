/**
 * Script de vérification de l'intégrité de la base de données
 * 
 * Ce script vérifie l'état des données dans la base pour s'assurer
 * que les comptes, proxies et business sont correctement configurés.
 */

import * as schema from './shared/schema';
import { eq, and } from 'drizzle-orm';
import { initializeDatabase, closeDatabase, db } from './server/db';

async function testDatabaseIntegrity() {
  console.log("🚀 VÉRIFICATION DE L'INTÉGRITÉ DE LA BASE DE DONNÉES\n");

  try {
    // Initialiser la base de données
    console.log("⏳ Initialisation de la base de données...");
    await initializeDatabase();
    console.log("✅ Base de données initialisée\n");
    
    // 1. Vérifier les comptes par plateforme
    console.log("⏳ Vérification des comptes par plateforme...");
    
    // Google
    const googleAccounts = await db.select().from(schema.postingAccounts)
      .where(eq(schema.postingAccounts.platform, 'google'));
    
    // Trustpilot
    const trustpilotAccounts = await db.select().from(schema.postingAccounts)
      .where(eq(schema.postingAccounts.platform, 'trustpilot'));
    
    // TripAdvisor
    const tripadvisorAccounts = await db.select().from(schema.postingAccounts)
      .where(eq(schema.postingAccounts.platform, 'tripadvisor'));
    
    console.log(`✅ Comptes Google: ${googleAccounts.length}`);
    console.log(`✅ Comptes Trustpilot: ${trustpilotAccounts.length}`);
    console.log(`✅ Comptes TripAdvisor: ${tripadvisorAccounts.length}`);
    console.log(`✅ Total des comptes: ${googleAccounts.length + trustpilotAccounts.length + tripadvisorAccounts.length}\n`);
    
    // 2. Vérifier les proxies
    console.log("⏳ Vérification des proxies...");
    
    const allProxies = await db.select().from(schema.proxies);
    const activeProxies = await db.select().from(schema.proxies)
      .where(eq(schema.proxies.status, 'active'));
    const coolingProxies = await db.select().from(schema.proxies)
      .where(eq(schema.proxies.status, 'cooling'));
    const blockedProxies = await db.select().from(schema.proxies)
      .where(eq(schema.proxies.status, 'blocked'));
    
    console.log(`✅ Proxies actifs: ${activeProxies.length}`);
    console.log(`✅ Proxies en refroidissement: ${coolingProxies.length}`);
    console.log(`✅ Proxies bloqués: ${blockedProxies.length}`);
    console.log(`✅ Total des proxies: ${allProxies.length}\n`);
    
    // 3. Vérifier les entreprises
    console.log("⏳ Vérification des entreprises...");
    
    const businesses = await db.select().from(schema.businesses);
    
    console.log(`✅ Total des entreprises: ${businesses.length}`);
    if (businesses.length > 0) {
      console.log("✅ Liste des entreprises:");
      businesses.forEach(business => {
        console.log(`   - ${business.name} (ID: ${business.id}, Type: ${business.type})`);
      });
    }
    console.log();
    
    // 4. Vérifier les avis
    console.log("⏳ Vérification des avis...");
    
    const allReviews = await db.select().from(schema.reviews);
    const pendingReviews = await db.select().from(schema.reviews)
      .where(eq(schema.reviews.status, 'pending'));
    const postedReviews = await db.select().from(schema.reviews)
      .where(eq(schema.reviews.status, 'posted'));
    const failedReviews = await db.select().from(schema.reviews)
      .where(eq(schema.reviews.status, 'failed'));
    
    console.log(`✅ Avis en attente: ${pendingReviews.length}`);
    console.log(`✅ Avis publiés: ${postedReviews.length}`);
    console.log(`✅ Avis échoués: ${failedReviews.length}`);
    console.log(`✅ Total des avis: ${allReviews.length}`);
    
    // Afficher le dernier avis créé
    if (allReviews.length > 0) {
      // Trier les avis par date de création (du plus récent au plus ancien)
      const sortedReviews = [...allReviews].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const lastReview = sortedReviews[0];
      
      console.log("\n📝 Dernier avis créé:");
      console.log(`   - ID: ${lastReview.id}`);
      console.log(`   - Statut: ${lastReview.status}`);
      console.log(`   - Entreprise ID: ${lastReview.businessId}`);
      console.log(`   - Créé le: ${lastReview.createdAt}`);
      console.log(`   - Contenu: ${lastReview.content.substring(0, 100)}${lastReview.content.length > 100 ? '...' : ''}`);
      if (lastReview.error) {
        console.log(`   - Erreur: ${lastReview.error}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    // Fermer la connexion à la base de données
    await closeDatabase();
  }
}

// Exécution du script
testDatabaseIntegrity()
  .then(() => {
    console.log("\n✅ Test d'intégrité terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur non gérée:", error);
    process.exit(1);
  });