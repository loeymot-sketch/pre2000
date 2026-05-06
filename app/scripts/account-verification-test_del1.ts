/**
 * Test de vérification des comptes utilisateur
 * 
 * Ce script teste spécifiquement la capacité du système à vérifier les comptes 
 * automatiquement après leur création et à maintenir des sessions valides
 */

import { initializeDatabase, db } from './server/db';
import * as schema from './shared/schema';
import { deepVerificationService } from './server/services/deep-verification.service';
import { enhancedProxyManager } from './server/services/enhanced-proxy-management.service';
import { faker } from '@faker-js/faker';
import { eq, and, or, sql } from 'drizzle-orm';

// Fonction pour enregistrer dans un fichier journal
function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function testAccountVerification() {
  log('Démarrage du test de vérification des comptes...');
  
  // Initialiser la base de données
  const dbInitSuccess = await initializeDatabase();
  if (!dbInitSuccess) {
    log('Échec de l\'initialisation de la base de données');
    return;
  }
  
  // Récupérer des comptes pour le test
  const testAccounts = await db.select()
    .from(schema.postingAccounts)
    .where(
      and(
        eq(schema.postingAccounts.status, 'active'),
        eq(schema.postingAccounts.platform, 'google')
      )
    )
    .limit(2);
  
  if (testAccounts.length === 0) {
    log('Aucun compte disponible pour le test. Création de comptes de test...');
    
    // Créer des comptes de test
    await db.insert(schema.postingAccounts)
      .values([
        {
          platform: 'google',
          email: 'test.account1@example.com',
          password: 'TestPassword123!',
          status: 'active',
          createdAt: new Date(),
          reviewCount: 0,
          consecutiveUses: 0
        },
        {
          platform: 'trustpilot',
          email: 'test.account2@example.com',
          password: 'TestPassword123!',
          status: 'active',
          createdAt: new Date(),
          reviewCount: 0,
          consecutiveUses: 0
        }
      ]);
    
    log('Comptes de test créés');
    
    // Récupérer les comptes créés
    const newAccounts = await db.select()
      .from(schema.postingAccounts)
      .orderBy(sql`${schema.postingAccounts.id} DESC`)
      .limit(2);
    
    if (newAccounts.length === 0) {
      log('Échec de récupération des comptes de test');
      return;
    }
    
    log(`${newAccounts.length} comptes de test disponibles pour le test`);
    
    // Test de création de proxies
    log('Création de proxies de test...');
    const proxyResult = await enhancedProxyManager.createBrightDataProxyPool('google', 5);
    log(`Résultat de création des proxies: ${JSON.stringify(proxyResult)}`);
    
    // Tester la vérification
    for (const account of newAccounts) {
      log(`Vérification du compte ${account.id} (${account.platform})...`);
      
      try {
        const result = await deepVerificationService.verifyAccount(account.id, {
          fullLogin: true,
          simulateBrowsing: true
        });
        
        log(`Résultat de vérification pour le compte ${account.id}: ${JSON.stringify(result)}`);
      } catch (error) {
        log(`Erreur lors de la vérification du compte ${account.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    log(`${testAccounts.length} comptes disponibles pour le test`);
    
    // Tester la vérification sur les comptes existants
    for (const account of testAccounts) {
      log(`Vérification du compte ${account.id} (${account.platform})...`);
      
      try {
        const result = await deepVerificationService.verifyAccount(account.id, {
          fullLogin: true,
          simulateBrowsing: true
        });
        
        log(`Résultat de vérification pour le compte ${account.id}: ${JSON.stringify(result)}`);
      } catch (error) {
        log(`Erreur lors de la vérification du compte ${account.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Tester la vérification par lots
  log('Test de vérification par lots...');
  
  try {
    const batchResult = await deepVerificationService.verifyAccountBatch({
      limit: 3,
      randomSample: true
    });
    
    log(`Résultat de la vérification par lots: ${JSON.stringify({
      total: batchResult.total,
      success: batchResult.success,
      failed: batchResult.failed,
      blocked: batchResult.blocked,
      suspicious: batchResult.suspicious
    })}`);
  } catch (error) {
    log(`Erreur lors de la vérification par lots: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Obtenir des statistiques sur la santé des comptes
  log('Obtention des statistiques de santé des comptes...');
  
  try {
    const healthStats = await deepVerificationService.getAccountHealthStatistics();
    log(`Statistiques de santé des comptes: ${JSON.stringify(healthStats.summary)}`);
  } catch (error) {
    log(`Erreur lors de l'obtention des statistiques: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  log('Test de vérification des comptes terminé');
}

// Exécution du test
testAccountVerification().catch(error => {
  log(`Erreur non gérée: ${error instanceof Error ? error.message : String(error)}`);
});