/**
 * Script pour mettre à jour les avis afin qu'ils soient visibles dans l'interface utilisateur
 * 
 * Ce script s'assure que les avis sont liés au bon utilisateur dans l'interface
 */

import { db } from './server/db';
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';

async function linkReviewsToCurrentUser() {
  try {
    // Nous allons utiliser l'ID utilisateur 1 pour s'assurer que les avis sont visibles dans l'UI
    const userId = 1;
    
    // Liste des entreprises avec des avis publiés
    const businessIds = [9, 11, 12, 13, 14];
    
    // S'assurer que toutes ces entreprises appartiennent à l'utilisateur actuel
    for (const businessId of businessIds) {
      await db.update(schema.businesses)
        .set({ userId })
        .where(eq(schema.businesses.id, businessId));
      
      console.log(`Business ID ${businessId} assigné à l'utilisateur ${userId}`);
    }
    
    console.log('\nTous les business sont maintenant visibles dans l\'UI pour l\'utilisateur actuel');
    console.log('\nVoici le détail des avis publiés par business:');
    console.log('----------------------------------------------');
    
    // Afficher les avis publiés par business
    for (const businessId of businessIds) {
      // Récupérer les infos du business
      const business = await db.select().from(schema.businesses)
        .where(eq(schema.businesses.id, businessId))
        .limit(1);
      
      if (business.length === 0) continue;
      
      // Récupérer les avis publiés pour ce business
      const reviews = await db.select({
        id: schema.reviews.id,
        platform: schema.reviews.platform,
        status: schema.reviews.status,
        postTime: schema.reviews.postTime
      })
      .from(schema.reviews)
      .where(eq(schema.reviews.businessId, businessId));
      
      const publishedReviews = reviews.filter(r => r.status === 'posted');
      
      console.log(`\nEntreprise: ${business[0].name} (ID: ${businessId})`);
      console.log(`Type: ${business[0].type}`);
      console.log(`Nombre d'avis publiés: ${publishedReviews.length}`);
      
      if (publishedReviews.length > 0) {
        publishedReviews.forEach(review => {
          console.log(`- Avis #${review.id} (${review.platform}) - Publié le: ${review.postTime?.toLocaleString() || 'Date inconnue'}`);
        });
      }
    }
    
    console.log('\n✅ Mise à jour terminée. Vous pouvez maintenant voir les avis dans l\'UI.');
    console.log('URL: http://localhost:5000');
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
  }
}

linkReviewsToCurrentUser();