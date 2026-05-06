/**
 * Script pour créer un compte de test Trustpilot
 * 
 * Ce script crée un compte de test pour Trustpilot dans la base de données
 * avec des informations optimisées pour la publication d'avis.
 */

import { initializeDatabase, closeDatabase, db } from './server/db';
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Crée un nouveau compte de test pour Trustpilot
 */
async function createTrustpilotTestAccount(): Promise<void> {
  try {
    console.log("🚀 CRÉATION D'UN COMPTE DE TEST TRUSTPILOT\n");
    
    // Initialiser la base de données
    console.log("⏳ Initialisation de la base de données...");
    await initializeDatabase();
    console.log("✅ Base de données initialisée\n");
    
    // 1. Vérifier si un proxy optimisé pour Trustpilot existe
    console.log("⏳ Recherche d'un proxy optimisé pour Trustpilot...");
    
    // Recherche d'un proxy avec le terme "trustpilot" dans le nom d'utilisateur ou les options
    const proxies = await db.select().from(schema.proxies)
      .where(eq(schema.proxies.status, 'active'));
    
    if (proxies.length === 0) {
      console.log("❌ Aucun proxy actif trouvé! Veuillez d'abord configurer des proxies.");
      return;
    }
    
    // Choisir le premier proxy disponible optimisé pour Trustpilot (ou le premier si aucun n'est optimisé)
    const proxy = proxies[0];
    console.log(`✅ Proxy trouvé: ID ${proxy.id} (${proxy.host}:${proxy.port})\n`);
    
    // 2. Générer des informations de compte aléatoires
    console.log("⏳ Génération des informations de compte...");
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    
    // Informations du compte
    const email = `test.trustpilot.${timestamp}.${randomString}@reviewflow-testing.com`;
    const password = crypto.randomBytes(12).toString('hex');
    
    // Informations supplémentaires
    const firstName = "Test";
    const lastName = "User";
    const recoveryEmail = `recovery.${timestamp}@reviewflow-testing.com`;
    const phoneNumber = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    
    console.log("✅ Informations générées:");
    console.log(`   - Email: ${email}`);
    console.log(`   - Mot de passe: ${password}`);
    console.log(`   - Nom: ${firstName} ${lastName}`);
    console.log(`   - Email de récupération: ${recoveryEmail}`);
    console.log(`   - Téléphone: ${phoneNumber}\n`);
    
    // 3. Créer le compte dans la base de données
    console.log("⏳ Création du compte dans la base de données...");
    
    const [newAccount] = await db.insert(schema.postingAccounts)
      .values({
        email: email,
        password: password,
        platform: "trustpilot",
        status: "active",
        proxyId: proxy.id,
        firstName: firstName,
        lastName: lastName,
        recoveryEmail: recoveryEmail,
        phoneNumber: phoneNumber,
        creationDate: new Date(),
        creationIp: "127.0.0.1",
        accountConfidenceScore: 90, // Score de confiance élevé pour les tests
        reviewCount: 0,
        consecutiveUses: 0,
        lastBehaviorSimulation: null
      })
      .returning();
    
    console.log(`✅ Compte créé avec succès: ID ${newAccount.id}\n`);
    
    // 4. Vérifier l'existence d'une entreprise Trustpilot
    console.log("⏳ Vérification de l'existence d'une entreprise Trustpilot de test...");
    
    const businesses = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.type, 'trustpilot'));
    
    let businessId: number;
    
    if (businesses.length > 0) {
      businessId = businesses[0].id;
      console.log(`✅ Entreprise Trustpilot existante trouvée: ID ${businessId}\n`);
    } else {
      // Créer une entreprise de test Trustpilot
      console.log("⏳ Création d'une entreprise Trustpilot de test...");
      
      const [newBusiness] = await db.insert(schema.businesses)
        .values({
          name: "Trustpilot Test Business",
          type: "trustpilot",
          description: "Entreprise de test pour les avis Trustpilot",
          userId: 1,
          products: "Service en ligne",
          keywords: "test,trustpilot,avis",
          websiteUrl: "https://www.example-trustpilot-test.com"
        })
        .returning();
      
      businessId = newBusiness.id;
      console.log(`✅ Entreprise créée avec succès: ID ${businessId}\n`);
    }
    
    // 5. Créer un avis de test pour l'entreprise
    console.log("⏳ Création d'un avis de test...");
    
    const reviewContent = "★★★★★ Excellent service! Une expérience très satisfaisante avec cette entreprise. L'interface est intuitive et le support client est réactif. Je recommande vivement leur service à tous ceux qui cherchent une solution fiable et efficace.";
    
    const [newReview] = await db.insert(schema.reviews)
      .values({
        businessId: businessId,
        postingAccountId: newAccount.id,
        platform: "trustpilot",
        rating: 5,
        content: reviewContent,
        status: "pending",
        createdAt: new Date(),
        generatedBy: "manual",
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // Prévu dans 5 minutes
      })
      .returning();
    
    console.log(`✅ Avis créé avec succès: ID ${newReview.id}`);
    console.log(`   - Contenu: ${reviewContent.substring(0, 50)}...\n`);
    
    console.log("📋 RÉCAPITULATIF DES INFORMATIONS DE TEST:");
    console.log(`   - ID du compte: ${newAccount.id}`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Mot de passe: ${password}`);
    console.log(`   - ID de l'entreprise: ${businessId}`);
    console.log(`   - ID de l'avis: ${newReview.id}`);
    console.log(`   - ID du proxy: ${proxy.id}`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la création du compte de test:", error);
  } finally {
    // Fermer la connexion à la base de données
    await closeDatabase();
  }
}

// Exécuter le script
createTrustpilotTestAccount()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur non gérée:", error);
    process.exit(1);
  });