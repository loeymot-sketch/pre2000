/**
 * Script de test pour la génération d'avis avec l'API OpenAI
 */

import { AIService } from './server/services/ai.service';
import { PgStorage } from './server/pg-storage';

async function main() {
  try {
    // Initialisation des services
    const aiService = new AIService();
    const storage = new PgStorage();
    
    // Récupérer le premier business
    const businesses = await storage.getBusinesses();
    if (businesses.length === 0) {
      throw new Error("Aucun business disponible pour tester la génération d'avis");
    }
    
    const testBusiness = businesses[0];
    console.log(`Business sélectionné pour le test: ${testBusiness.name} (ID: ${testBusiness.id})`);
    console.log(`Type: ${testBusiness.type}, Description: ${testBusiness.description}`);
    
    // Générer 3 avis de test
    console.log("\nGénération de 3 avis de test avec OpenAI...");
    const reviews = await aiService.generateReviews(testBusiness, 3);
    
    // Afficher les avis générés
    console.log("\n=== Avis générés ===");
    reviews.forEach((review, index) => {
      console.log(`\nAvis #${index + 1}:`);
      console.log(`"${review}"`);
    });
    
    console.log("\nTest de génération d'avis terminé avec succès!");
    
  } catch (error) {
    console.error("Erreur lors du test de génération d'avis:", error);
  } finally {
    process.exit(0);
  }
}

main();