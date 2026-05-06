/**
 * Script pour créer un compte de test pour Google
 * 
 * Ce script crée un compte de test pour Google dans la base de données
 * pour permettre les tests de publication d'avis.
 */

import { db } from './server/db';
import { storage } from './server/storage';

async function createTestAccount() {
  console.log("🚀 CRÉATION D'UN COMPTE DE TEST POUR GOOGLE");
  
  try {
    // Vérifier si des comptes Google existent déjà
    const existingAccounts = await storage.getPostingAccounts('google');
    
    if (existingAccounts.length > 0) {
      console.log(`\n✅ Des comptes Google existent déjà (${existingAccounts.length} trouvés)`);
      
      // Afficher le premier compte
      const firstAccount = existingAccounts[0];
      console.log(`\n📋 Premier compte: ${firstAccount.email} (ID: ${firstAccount.id})`);
      return;
    }
    
    // Créer un nouveau compte Google de test
    const newAccount = await storage.createPostingAccount({
      platform: 'google',
      email: 'test.user@gmail.com',
      password: 'TestPassword123',
      status: 'active',
      createdAt: new Date(),
      lastUsed: null,
      reviewCount: 0,
      proxyId: null,
      recoveryEmail: 'recovery@example.com',
      phoneNumber: '+33612345678',
      creationIp: '192.168.1.1',
      countryCode: 'FR',
      failureCount: 0,
      consecutiveUses: 0,
      riskLevel: 'low',
      verificationStatus: 'verified',
      lastLoginAt: null,
      cookieJar: null,
      resetAfter: null,
      browserFingerprint: JSON.stringify({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        language: 'fr-FR',
        screenResolution: '1920x1080',
        timezone: 'Europe/Paris',
        platform: 'MacIntel'
      }),
      lastBehaviorSimulation: null
    });
    
    console.log(`\n✅ Nouveau compte Google créé avec succès: ${newAccount.email} (ID: ${newAccount.id})`);
    
  } catch (error) {
    console.error(`\n❌ Erreur lors de la création du compte: ${error instanceof Error ? error.message : String(error)}`);
  }
}

createTestAccount()
  .catch(err => {
    console.error(`\n❌ Erreur critique: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  })
  .finally(() => {
    console.log("\n✅ Opération terminée");
    process.exit(0);
  });