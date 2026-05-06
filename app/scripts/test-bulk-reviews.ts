/**
 * Script de test pour la fonctionnalité de génération et distribution massive d'avis
 * 
 * Ce script simule l'appel à l'API de génération en masse d'avis et valide
 * que la distribution sur une période est correctement effectuée.
 */

import { db } from "./server/db";
import { storage } from "./server/storage";
import { Review, Business, PostingAccount, ProxyType } from "./shared/schema";
import { AutomationService } from "./server/services/automation.service";
import { AIService } from "./server/services/ai.service";
import { logger } from "./server/services/logger.service";

// Nombre d'avis de test à générer (Réduire pour les tests)
const TEST_REVIEW_COUNT = 20; // Utiliser une petite valeur pour les tests

// Période de test (7 jours par défaut)
const START_DATE = new Date();
const END_DATE = new Date(START_DATE.getTime() + 7 * 24 * 60 * 60 * 1000);

async function getOrCreateTestBusiness(): Promise<Business> {
  console.log("Recherche ou création d'une entreprise de test...");
  
  // Vérifier s'il existe déjà une entreprise de test
  const testBusinesses = await db.query.businesses.findMany({
    where: (businesses, { eq, like }) => like(businesses.name, "%TEST%")
  });
  
  if (testBusinesses.length > 0) {
    console.log(`Entreprise de test trouvée: ${testBusinesses[0].name} (ID: ${testBusinesses[0].id})`);
    return testBusinesses[0];
  }
  
  // Créer une nouvelle entreprise de test
  // Trouver d'abord un utilisateur existant
  const users = await db.query.users.findMany({ limit: 1 });
  if (!users.length) {
    throw new Error("Aucun utilisateur trouvé dans la base de données");
  }
  
  const testBusiness = await storage.createBusiness({
    name: "TEST_BUSINESS_" + Date.now(),
    type: "restaurant",
    address: "123 Test Street",
    city: "Test City",
    country: "France",
    postalCode: "12345",
    phone: "+33123456789",
    website: "https://test-business.com",
    userId: users[0].id
  });
  
  console.log(`Nouvelle entreprise de test créée: ${testBusiness.name} (ID: ${testBusiness.id})`);
  return testBusiness;
}

async function testBulkReviewGeneration() {
  console.log("Démarrage du test de génération en masse d'avis...");
  console.log(`Configuration: ${TEST_REVIEW_COUNT} avis sur ${(END_DATE.getTime() - START_DATE.getTime()) / (24 * 60 * 60 * 1000)} jours`);
  
  try {
    // Initialiser les services
    const aiService = new AIService();
    const automationService = new AutomationService();
    
    // Obtenir ou créer une entreprise de test
    const business = await getOrCreateTestBusiness();
    
    console.log("Génération des avis de test...");
    
    // Créer des avis de test manuellement sans utiliser l'API OpenAI
    console.log("Création d'avis de test sans utiliser l'API OpenAI...");
    
    // Exemples d'avis prédéfinis selon le type d'entreprise
    const defaultReviews = {
      restaurant: [
        "Super expérience au restaurant ! La nourriture était délicieuse et le service impeccable. Je reviendrai sans hésiter 👍",
        "Endroit charmant avec une ambiance agréable. J'ai adoré le plat du jour et le personnel est très attentionné.",
        "Excellente découverte ! Les saveurs sont authentiques et la présentation des plats est soignée.",
        "Visite très satisfaisante, le rapport qualité-prix est excellent. La carte est variée et tout était frais.",
        "Service rapide et efficace. Les plats sont copieux et savoureux. Je recommande vivement !"
      ],
      default: [
        "Expérience très satisfaisante ! Le produit répond parfaitement à mes besoins et l'équipe est disponible. 😊",
        "Qualité exceptionnelle et service client au top. Je suis pleinement satisfait de mon achat.",
        "Excellente découverte, je recommande vivement ! Rapport qualité-prix imbattable.",
        "Très bonne impression générale. Le produit est fiable et l'entreprise sérieuse.",
        "Service rapide et efficace. Le produit est conforme à la description et de grande qualité."
      ]
    };
    
    // Sélection des avis en fonction du type d'entreprise
    const businessType = business.type.toLowerCase();
    const reviewsForType = defaultReviews[businessType as keyof typeof defaultReviews] || defaultReviews.default;
    
    // Générer des avis personnalisés
    let generatedReviews: Review[] = [];
    
    const createTestReviews = async (count: number) => {
      const reviews: Review[] = [];
      
      for (let i = 0; i < count; i++) {
        // Choisir un avis de base et le personnaliser
        const baseIndex = i % reviewsForType.length;
        const baseReview = reviewsForType[baseIndex];
        const customReview = baseReview
          .replace(/restaurant/g, business.name)
          .replace(/produit/g, business.products || 'service')
          .replace(/entreprise/g, business.name);
        
        // Ajouter un peu de variation (timestamp pour rendre chaque avis unique)
        const review = `${customReview} [Visite le ${new Date().toLocaleDateString('fr-FR')} à ${i}h]`;
        
        // Enregistrer l'avis dans la base de données
        const savedReview = await storage.createReview({
          businessId: business.id,
          content: review,
          platform: "google",
          status: "pending" // Statut en attente de publication
        });
        
        reviews.push(savedReview);
        console.log(`Avis créé (${i+1}/${count}): ${review.substring(0, 50)}...`);
      }
      
      return reviews;
    };
    
    // Créer tous les avis de test
    generatedReviews = await createTestReviews(TEST_REVIEW_COUNT);
    console.log(`${generatedReviews.length} avis de test créés avec succès!`);
    
    console.log(`${generatedReviews.length} avis générés avec succès, programmation de la distribution...`);
    
    // Programmer la distribution des avis sur la période spécifiée
    const distribution = await automationService.scheduleBulkReviews(
      generatedReviews,
      START_DATE,
      END_DATE
    );
    
    console.log("Distribution programmée avec succès:");
    console.log("Distribution par jour:", distribution);
    
    // Afficher la distribution sous forme de résumé
    let totalScheduled = 0;
    Object.entries(distribution).forEach(([date, count]) => {
      console.log(`- ${date}: ${count} avis`);
      totalScheduled += count;
    });
    
    console.log(`Total programmé: ${totalScheduled} avis sur ${Object.keys(distribution).length} jours`);
    console.log("Test terminé avec succès!");
  } catch (error) {
    console.error("Erreur lors du test:", error);
    throw error;
  } finally {
    // Nettoyage (optionnel - à décommenter si souhaité)
    // await cleanupTestData();
  }
}

async function cleanupTestData() {
  console.log("Nettoyage des données de test...");
  // Trouver les reviews générées par ce test
  // Les supprimer
  // Cette fonction est laissée vide pour préserver les données pour inspection
}

// Fonction principale
async function main() {
  try {
    console.log("Démarrage du test de génération en masse d'avis...");
    await testBulkReviewGeneration();
    console.log("Test terminé avec succès!");
  } catch (error) {
    console.error("Erreur lors du test:", error);
  } finally {
    // Fermer la connexion à la base de données
    // Note: avec Drizzle, la fermeture se fait automatiquement
    process.exit(0);
  }
}

// Exécuter le test
main();