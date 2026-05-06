/**
 * Script pour créer un business de test 
 * 
 * Ce script crée un business de test dans la base de données
 * pour permettre les tests de publication d'avis.
 */

import { db } from './server/db';
import { storage } from './server/storage';

async function createTestBusiness() {
  console.log("🚀 CRÉATION D'UN BUSINESS DE TEST");
  
  try {
    // Vérifier si un business existe déjà
    const existingBusinesses = await storage.getBusinesses();
    
    if (existingBusinesses.length > 0) {
      console.log(`\n✅ Un business existe déjà: ${existingBusinesses[0].name} (ID: ${existingBusinesses[0].id})`);
      return;
    }
    
    // Créer un nouveau business
    const newBusiness = await storage.createBusiness({
      userId: 1, // Utilisateur par défaut
      name: "TEST-BUSINESS",
      type: "local",
      address: "123 Test Street, Test City",
      googleUrl: "https://maps.google.com/?cid=12345678901234567890",
      trustpilotUrl: "https://www.trustpilot.com/review/test-business.com",
      tripadvisorUrl: "https://www.tripadvisor.com/Restaurant_Review-g12345-d12345-Reviews-Test_Business-Test_City.html",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`\n✅ Nouveau business créé avec succès: ${newBusiness.name} (ID: ${newBusiness.id})`);
    
  } catch (error) {
    console.error(`\n❌ Erreur lors de la création du business: ${error instanceof Error ? error.message : String(error)}`);
  }
}

createTestBusiness()
  .catch(err => {
    console.error(`\n❌ Erreur critique: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  })
  .finally(() => {
    console.log("\n✅ Opération terminée");
    process.exit(0);
  });