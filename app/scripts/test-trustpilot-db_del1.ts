/**
 * Test simple d'accès direct à la base de données pour les tests Trustpilot
 * 
 * Ce script interroge directement la base de données PostgreSQL
 * pour récupérer l'entreprise Trustpilot et les comptes associés.
 */

import { db } from './server/db';
import { businesses, postingAccounts, proxies } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testTrustpilotDatabase() {
  console.log('Début du test de la base de données Trustpilot...');
  
  try {
    // 1. Récupérer toutes les entreprises
    console.log('Récupération de toutes les entreprises...');
    const allBusinesses = await db.select().from(businesses);
    console.log(`Total d'entreprises: ${allBusinesses.length}`);
    
    // 2. Afficher les types d'entreprises disponibles
    const businessTypes = {};
    allBusinesses.forEach(b => {
      if (!businessTypes[b.type]) businessTypes[b.type] = [];
      businessTypes[b.type].push({
        id: b.id,
        name: b.name
      });
    });
    console.log('Entreprises par type:');
    console.log(JSON.stringify(businessTypes, null, 2));
    
    // 3. Récupérer spécifiquement l'entreprise Trustpilot
    console.log("Recherche d'entreprises Trustpilot...");
    const trustpilotBusinesses = await db.select().from(businesses).where(eq(businesses.type, 'trustpilot'));
    
    if (trustpilotBusinesses.length === 0) {
      console.log('❌ Aucune entreprise Trustpilot trouvée dans la base de données!');
      return false;
    }
    
    const business = trustpilotBusinesses[0];
    console.log(`✅ Entreprise Trustpilot trouvée: ${business.name} (ID: ${business.id})`);
    
    // 4. Récupérer les comptes Trustpilot
    console.log('Récupération des comptes Trustpilot...');
    const trustpilotAccounts = await db.select().from(postingAccounts).where(eq(postingAccounts.platform, 'trustpilot'));
    
    if (trustpilotAccounts.length === 0) {
      console.log('❌ Aucun compte Trustpilot trouvé dans la base de données!');
      return false;
    }
    
    console.log(`✅ Trouvé ${trustpilotAccounts.length} comptes Trustpilot`);
    console.log('Premier compte:', trustpilotAccounts[0].email);
    
    // 5. Récupérer les proxies actifs
    console.log('Récupération des proxies actifs...');
    const activeProxies = await db.select().from(proxies).where(eq(proxies.status, 'active'));
    
    if (activeProxies.length === 0) {
      console.log('❌ Aucun proxy actif trouvé dans la base de données!');
      return false;
    }
    
    console.log(`✅ Trouvé ${activeProxies.length} proxies actifs`);
    
    console.log('\nTest de la base de données réussi!');
    return true;
  } catch (error) {
    console.error('Erreur lors du test:', error);
    return false;
  }
}

// Exécuter le test
testTrustpilotDatabase()
  .then(success => {
    console.log(`\nTest ${success ? 'réussi ✅' : 'échoué ❌'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });