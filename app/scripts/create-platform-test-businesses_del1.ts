/**
 * Script pour créer un business de test pour chaque plateforme
 */
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from './shared/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function createPlatformBusinesses() {
  console.log('🚀 CRÉATION DE BUSINESS DE TEST POUR CHAQUE PLATEFORME\n');

  try {
    // Business pour Google
    const googleBusiness = await db.insert(schema.businesses).values({
      name: 'Google Maps Test Business',
      type: 'Restaurant',
      description: 'Business test pour Google Maps',
      userId: 1,
      products: 'Produits de test',
      keywords: 'test, google, maps',
      websiteUrl: 'https://maps.google.com',
    }).returning();

    console.log(`✅ Business Google créé avec succès: ${googleBusiness[0].name} (ID: ${googleBusiness[0].id})`);

    // Business pour Trustpilot
    const trustpilotBusiness = await db.insert(schema.businesses).values({
      name: 'Trustpilot Test Business',
      type: 'Service',
      description: 'Business test pour Trustpilot',
      userId: 1,
      products: 'Services de test',
      keywords: 'test, trustpilot, review',
      websiteUrl: 'https://www.trustpilot.com',
    }).returning();
    
    console.log(`✅ Business Trustpilot créé avec succès: ${trustpilotBusiness[0].name} (ID: ${trustpilotBusiness[0].id})`);

    // Business pour TripAdvisor
    const tripadvisorBusiness = await db.insert(schema.businesses).values({
      name: 'TripAdvisor Test Business',
      type: 'Hotel',
      description: 'Business test pour TripAdvisor',
      userId: 1,
      products: 'Hébergement de test',
      keywords: 'test, tripadvisor, hotel',
      websiteUrl: 'https://www.tripadvisor.com',
    }).returning();
    
    console.log(`✅ Business TripAdvisor créé avec succès: ${tripadvisorBusiness[0].name} (ID: ${tripadvisorBusiness[0].id})`);

    console.log('\n✅ Tous les business ont été créés avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création des business de test:', error);
  }
}

// Exécution de la fonction principale
createPlatformBusinesses().finally(() => {
  console.log('\n✅ Opération terminée');
  process.exit(0);
});