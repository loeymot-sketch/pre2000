/**
 * Script de test pour publier un avis sur chaque plateforme (Google, Trustpilot, TripAdvisor)
 * 
 * Ce script publie un avis sur chaque plateforme et affiche les résultats.
 */

import { db } from './server/db';
import * as schema from './shared/schema';
import { eq, and, or } from 'drizzle-orm';
import axios from 'axios';

// Configuration
const API_ENDPOINT = 'http://localhost:5000/api/simulate-review-posting';

interface ReviewPublishRequest {
  reviewId: number;
  businessId: number;
  accountId: number;
  platform: string;
  simulationOnly: boolean;
}

interface PublishResult {
  platform: string;
  success: boolean;
  reviewId?: number;
  businessId?: number;
  accountId?: number;
  errorMessage?: string;
}

/**
 * Sélectionne un compte valide pour une plateforme donnée
 */
async function selectAccount(platform: string): Promise<number | null> {
  try {
    const accounts = await db.select().from(schema.postingAccounts)
      .where(and(
        eq(schema.postingAccounts.platform, platform),
        eq(schema.postingAccounts.status, 'active')
      ))
      .limit(1);
    
    if (accounts.length === 0) {
      console.error(`No active account found for platform ${platform}`);
      return null;
    }
    
    return accounts[0].id;
  } catch (error: any) {
    console.error(`Error selecting account for ${platform}: ${error?.message || error}`);
    return null;
  }
}

/**
 * Sélectionne une entreprise valide pour une plateforme donnée
 */
async function selectBusiness(platform: string): Promise<number | null> {
  try {
    // Trouver une entreprise qui correspond à la plateforme
    const businesses = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.type, platform))
      .limit(1);
    
    if (businesses.length === 0) {
      console.error(`No business found for platform ${platform}`);
      return null;
    }
    
    return businesses[0].id;
  } catch (error: any) {
    console.error(`Error selecting business for ${platform}: ${error?.message || error}`);
    return null;
  }
}

/**
 * Sélectionne un avis non publié pour une plateforme et une entreprise données
 */
async function selectOrCreateReview(businessId: number, platform: string): Promise<number | null> {
  try {
    // D'abord, essayer de trouver un avis existant non publié
    const reviews = await db.select().from(schema.reviews)
      .where(and(
        eq(schema.reviews.businessId, businessId),
        eq(schema.reviews.platform, platform),
        or(
          eq(schema.reviews.status, 'pending'),
          eq(schema.reviews.status, 'draft')
        )
      ))
      .limit(1);
    
    if (reviews.length > 0) {
      return reviews[0].id;
    }
    
    // Si aucun avis n'est trouvé, en créer un nouveau
    console.log(`Creating new review for ${platform}`);
    
    // Générer un contenu aléatoire pour l'avis
    const rating = Math.floor(Math.random() * 3) + 3; // 3 à 5 étoiles
    const content = `Excellent service! J'ai vraiment apprécié l'expérience client. ${Math.random().toString(36).substring(2, 15)}`;
    
    const result = await db.insert(schema.reviews).values({
      businessId,
      content,
      platform,
      rating,
      status: 'pending',
      createdAt: new Date(),
      title: 'Test Review'
    }).returning({ id: schema.reviews.id });
    
    if (result.length === 0) {
      throw new Error('Failed to create review');
    }
    
    return result[0].id;
  } catch (error: any) {
    console.error(`Error selecting or creating review: ${error?.message || error}`);
    return null;
  }
}

/**
 * Publie un avis sur une plateforme donnée
 */
async function publishReview(platform: string): Promise<PublishResult> {
  try {
    // 1. Sélectionner un compte et une entreprise
    const accountId = await selectAccount(platform);
    if (!accountId) {
      return { 
        platform, 
        success: false, 
        errorMessage: `No available account for ${platform}` 
      };
    }
    
    const businessId = await selectBusiness(platform);
    if (!businessId) {
      return { 
        platform, 
        success: false, 
        errorMessage: `No available business for ${platform}` 
      };
    }
    
    // 2. Sélectionner ou créer un avis
    const reviewId = await selectOrCreateReview(businessId, platform);
    if (!reviewId) {
      return { 
        platform, 
        success: false, 
        errorMessage: `Failed to select or create review for ${platform}` 
      };
    }
    
    // 3. Appeler l'API de publication
    const requestData: ReviewPublishRequest = {
      reviewId,
      businessId,
      accountId,
      platform,
      simulationOnly: false // Publication réelle
    };
    
    console.log(`Sending request to publish review on ${platform}:`, requestData);
    
    const response = await axios.post(API_ENDPOINT, requestData);
    
    console.log(`Response from ${platform} publish:`, response.data);
    
    if (response.data.success) {
      return {
        platform,
        success: true,
        reviewId,
        businessId,
        accountId
      };
    } else {
      return {
        platform,
        success: false,
        errorMessage: response.data.message || 'Unknown error'
      };
    }
  } catch (error: any) {
    return {
      platform,
      success: false,
      errorMessage: error?.response?.data?.message || error?.message || 'Unknown error'
    };
  }
}

/**
 * Fonction principale pour publier des avis sur toutes les plateformes
 */
async function publishAllPlatformReviews() {
  console.log('Starting to publish reviews on all platforms...');
  
  const platforms = ['google', 'trustpilot', 'tripadvisor'];
  const results: PublishResult[] = [];
  
  for (const platform of platforms) {
    console.log(`\n=== Publishing review on ${platform} ===`);
    const result = await publishReview(platform);
    results.push(result);
    
    // Pause entre chaque publication pour éviter de surcharger le serveur
    if (platform !== platforms[platforms.length - 1]) {
      console.log('Waiting 2 seconds before next platform...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n=== SUMMARY ===');
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.platform}: Review ${result.reviewId} published successfully`);
    } else {
      console.log(`❌ ${result.platform}: Failed - ${result.errorMessage}`);
    }
  }
  
  // Vérifier si toutes les publications ont réussi
  const allSuccessful = results.every(r => r.success);
  
  if (allSuccessful) {
    console.log('\n🎉 SUCCESS: All reviews published successfully!');
  } else {
    console.log('\n⚠️ WARNING: Some reviews failed to publish. Check details above.');
  }
}

// Exécuter la fonction principale
publishAllPlatformReviews().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});