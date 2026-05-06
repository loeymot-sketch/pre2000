/**
 * Script de test pour la simulation de publication d'avis
 * 
 * Ce script utilise le nouvel endpoint /api/simulate-review pour
 * simuler la publication de plusieurs avis sur différentes plateformes
 * sans avoir à démarrer des navigateurs complets.
 */

import axios from 'axios';
import { db } from './server/db';
import { businesses, postingAccounts, reviews } from './shared/schema';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

// Configuration
const API_URL = 'http://localhost:5000/api/simulate-review';
const BUSINESS_ID = 10; // ID de Doge Vision
const REVIEWS_PER_PLATFORM = 5;
const PLATFORMS = ['google', 'trustpilot', 'tripadvisor'];

// Service d'IA simplifié pour générer des avis
class AIService {
  generateReview(businessName: string, platform: string): string {
    // Liste de modèles d'avis pour chaque plateforme
    const templates = {
      google: [
        `J'ai acheté des lunettes chez ${businessName} et je suis ravi(e) de mon achat. La qualité est excellente et le service client est impeccable.`,
        `Expérience très positive chez ${businessName}. Personnel attentionné et grande variété de modèles disponibles. Prix corrects.`,
        `${businessName} offre un excellent rapport qualité-prix. J'y ai trouvé exactement ce que je cherchais en un temps record.`,
        `Très satisfait(e) de mon achat chez ${businessName}. Les lunettes sont confortables et le style correspond parfaitement à ce que je voulais.`,
        `Service rapide et efficace chez ${businessName}. Je recommande vivement pour la qualité de leurs produits et le professionnalisme.`
      ],
      trustpilot: [
        `${businessName} mérite largement ses 5 étoiles. Service client exceptionnel et livraison rapide. Je suis un client fidèle maintenant.`,
        `Commande effectuée sur le site de ${businessName}, reçue en 3 jours seulement. Qualité au rendez-vous et prix très compétitifs.`,
        `Je cherchais des lunettes de qualité à un prix abordable et ${businessName} a dépassé mes attentes. Excellente expérience d'achat en ligne.`,
        `Processus d'achat simple et intuitif sur le site de ${businessName}. Le SAV est également très réactif. Recommandé à 100%.`,
        `Très content(e) de ma commande chez ${businessName}. Les photos correspondent parfaitement au produit reçu. Livraison soignée.`
      ],
      tripadvisor: [
        `Visite agréable chez ${businessName}. Le magasin est spacieux, bien agencé et le personnel est aux petits soins. Choix impressionnant.`,
        `J'ai visité plusieurs opticiens avant de choisir ${businessName}. Leur professionnalisme et leurs conseils personnalisés ont fait la différence.`,
        `L'équipe de ${businessName} prend vraiment le temps de comprendre vos besoins. Ambiance chaleureuse et service impeccable.`,
        `Excellent accueil chez ${businessName}. Prix transparents, sans mauvaises surprises. Je recommande cette enseigne pour son sérieux.`,
        `${businessName} propose un service complet: examen de vue, grand choix de montures et conseils avisés. Je suis très satisfait(e) de ma visite.`
      ]
    };

    // Sélection aléatoire d'un template pour la plateforme
    const platformTemplates = templates[platform as keyof typeof templates] || templates.google;
    const randomTemplate = platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
    
    // Ajout de quelques variations pour éviter les duplications exactes
    const variations = [
      ` Je reviendrai certainement !`,
      ` Hautement recommandé.`,
      ` Une adresse à connaître.`,
      ` Expérience 5 étoiles.`,
      ` Je suis pleinement satisfait(e).`,
      ''
    ];
    
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    
    return randomTemplate + randomVariation;
  }
}

// Classe principale pour la simulation de publication d'avis
class ReviewSimulator {
  private aiService: AIService;
  private businessName: string = "Doge Vision";

  constructor() {
    this.aiService = new AIService();
  }

  async initialize() {
    // Récupérer le nom de l'entreprise depuis la base de données
    try {
      const business = await db.select().from(businesses).where(eq(businesses.id, BUSINESS_ID)).limit(1);
      if (business && business.length > 0) {
        this.businessName = business[0].name;
      }
      console.log(`Entreprise cible: ${this.businessName} (ID: ${BUSINESS_ID})`);
    } catch (error) {
      console.error("Erreur lors de la récupération des informations de l'entreprise:", error);
    }
  }

  async simulateReviews() {
    console.log(`Démarrage de la simulation de ${REVIEWS_PER_PLATFORM} avis par plateforme...`);
    
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      platforms: {} as Record<string, { successful: number, failed: number }>
    };

    for (const platform of PLATFORMS) {
      results.platforms[platform] = { successful: 0, failed: 0 };
      
      console.log(`\nPublication d'avis sur ${platform.toUpperCase()}:`);
      
      for (let i = 0; i < REVIEWS_PER_PLATFORM; i++) {
        const content = this.aiService.generateReview(this.businessName, platform);
        
        try {
          console.log(`  [${i + 1}/${REVIEWS_PER_PLATFORM}] Envoi d'un avis...`);
          
          const response = await axios.post(API_URL, {
            businessId: BUSINESS_ID,
            content,
            platform
          });
          
          if (response.data.success) {
            console.log(`  ✅ Succès! ID de l'avis: ${response.data.review.id}`);
            results.successful++;
            results.platforms[platform].successful++;
          } else {
            console.log(`  ❌ Échec: ${response.data.message}`);
            results.failed++;
            results.platforms[platform].failed++;
          }
        } catch (error: any) {
          console.error(`  ❌ Erreur: ${error.message || 'Erreur inconnue'}`);
          results.failed++;
          results.platforms[platform].failed++;
        }
        
        // Petite pause entre les publications
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      }
    }
    
    results.total = results.successful + results.failed;
    return results;
  }

  async displayResults() {
    // Afficher les avis récemment publiés
    try {
      const recentReviews = await db.select()
        .from(reviews)
        .where(eq(reviews.businessId, BUSINESS_ID))
        .orderBy(reviews.createdAt, 'desc')
        .limit(REVIEWS_PER_PLATFORM * PLATFORMS.length + 5);
      
      console.log("\n--- Avis récemment publiés ---");
      for (const review of recentReviews) {
        const status = review.status === 'posted' ? '✅' : review.status === 'pending' ? '⏳' : '❌';
        console.log(`${status} [${review.platform.toUpperCase()}] ${review.content.substring(0, 50)}... (ID: ${review.id})`);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des avis récents:", error);
    }
  }

  async run() {
    await this.initialize();
    const results = await this.simulateReviews();
    
    console.log("\n=== Résumé de la simulation ===");
    console.log(`Total des avis: ${results.total}`);
    console.log(`Réussis: ${results.successful}`);
    console.log(`Échoués: ${results.failed}`);
    console.log("\nPar plateforme:");
    
    for (const platform of PLATFORMS) {
      const platformResult = results.platforms[platform];
      console.log(`- ${platform.toUpperCase()}: ${platformResult.successful} réussis, ${platformResult.failed} échoués`);
    }
    
    await this.displayResults();
  }
}

// Fonction principale
async function main() {
  const simulator = new ReviewSimulator();
  await simulator.run();
  
  // Fermeture de la connexion à la base de données
  await db.disconnect();
  console.log("\nSimulation terminée.");
}

// Exécution du script
main().catch(error => {
  console.error("Erreur lors de l'exécution du script:", error);
  process.exit(1);
});