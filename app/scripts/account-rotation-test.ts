/**
 * Test de la stratégie de rotation des comptes utilisateurs
 * 
 * Ce script teste la nouvelle implémentation de rotation intelligente des comptes,
 * incluant les périodes de repos et la sélection par niveau de risque.
 */

import { PostingAccount } from './shared/schema';
import { accountService } from './server/services/account.service';
import { storage } from './server/storage';
import { logger } from './server/services/logger.service';
import { faker } from '@faker-js/faker';
import { encryptionService } from './server/services/encryption.service';

// Configuration du test
const PLATFORM = 'google';
const TEST_ACCOUNT_COUNT = 10;
const TEST_ITERATIONS = 20;

// Résultats du test
interface AccountSelectionResult {
  iteration: number;
  accountId: number;
  reviewCount: number;
  consecutiveUses: number;
  lastUsed: Date | null;
  daysSinceLastUse: number | null;
  riskLevel: 'low' | 'medium' | 'high';
}

// Fonction utilitaire pour créer des comptes de test
async function createTestAccounts(count: number): Promise<PostingAccount[]> {
  console.log(`[INFO] Création de ${count} comptes de test...`);
  
  const accounts: PostingAccount[] = [];
  
  for (let i = 0; i < count; i++) {
    // Générer un email et un mot de passe aléatoires
    const email = faker.internet.email();
    const password = faker.internet.password();
    
    // Chiffrer les données sensibles comme dans l'application réelle
    const encryptedEmail = await encryptionService.encryptForStorage(email);
    const encryptedPassword = await encryptionService.encryptForStorage(password);
    
    // Créer un compte avec des attributs variés pour tester la sélection
    const account = await storage.createPostingAccount({
      platform: PLATFORM,
      email: encryptedEmail,
      password: encryptedPassword,
      status: 'active',
      proxyId: Math.floor(Math.random() * 5) + 1, // ID de proxy aléatoire entre 1 et 5
      reviewCount: Math.floor(Math.random() * 3), // 0-2 avis publiés
      consecutiveUses: Math.floor(Math.random() * 2), // 0-1 utilisations consécutives
      // Pour certains comptes, simuler une utilisation récente
      lastUsed: Math.random() > 0.7 ? new Date() : null
    });
    
    accounts.push(account);
    console.log(`[INFO] Compte créé: ID ${account.id}, Review count: ${account.reviewCount}, Consecutive uses: ${account.consecutiveUses}`);
  }
  
  return accounts;
}

// Fonction principale du test
async function testAccountRotation() {
  console.log('====== TEST DE ROTATION DES COMPTES UTILISATEURS ======');
  console.log(`Plateforme: ${PLATFORM}`);
  console.log(`Nombre de comptes: ${TEST_ACCOUNT_COUNT}`);
  console.log(`Nombre d'itérations: ${TEST_ITERATIONS}`);
  console.log('');
  
  try {
    // S'assurer que nous avons des comptes de test
    let accounts = await storage.getPostingAccountsByPlatform(PLATFORM);
    
    if (accounts.length < TEST_ACCOUNT_COUNT) {
      accounts = await createTestAccounts(TEST_ACCOUNT_COUNT - accounts.length);
    } else {
      console.log(`[INFO] ${accounts.length} comptes existants trouvés pour la plateforme ${PLATFORM}`);
    }
    
    // Exécuter plusieurs itérations de sélection de compte
    const results: AccountSelectionResult[] = [];
    const accountsUsed = new Set<number>();
    const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    
    console.log('\n[INFO] Début des tests de sélection de compte...');
    
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      // Alterner entre les niveaux de risque
      const riskLevel = riskLevels[i % riskLevels.length];
      
      console.log(`\n[Itération ${i+1}/${TEST_ITERATIONS}] Sélection avec niveau de risque: ${riskLevel}`);
      
      const selectedAccount = await accountService.selectOptimalAccount(PLATFORM, undefined, riskLevel);
      
      if (!selectedAccount) {
        console.log(`[ERREUR] Aucun compte disponible pour l'itération ${i+1}`);
        continue;
      }
      
      accountsUsed.add(selectedAccount.id);
      
      // Calculer le nombre de jours depuis la dernière utilisation
      const daysSinceLastUse = selectedAccount.lastUsed 
        ? Math.round((Date.now() - selectedAccount.lastUsed.getTime()) / (24 * 60 * 60 * 1000)) 
        : null;
      
      // Enregistrer les résultats
      results.push({
        iteration: i + 1,
        accountId: selectedAccount.id,
        reviewCount: selectedAccount.reviewCount || 0,
        consecutiveUses: selectedAccount.consecutiveUses || 0,
        lastUsed: selectedAccount.lastUsed,
        daysSinceLastUse,
        riskLevel
      });
      
      console.log(`[INFO] Compte sélectionné: ID ${selectedAccount.id}, Reviews: ${selectedAccount.reviewCount || 0}, Consécutifs: ${selectedAccount.consecutiveUses || 0}`);
      
      // Simuler l'utilisation du compte
      await accountService.updateAccountUsageStats(
        selectedAccount.id, 
        true, // Simuler un succès
        'FR' // Simuler l'utilisation en France
      );
      
      // Attendre un peu pour éviter les conflits de timestamp
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Générer un rapport récapitulatif
    console.log('\n====== RAPPORT DE TEST DE ROTATION ======');
    console.log(`Total comptes utilisés: ${accountsUsed.size}/${accounts.length}`);
    
    const usageDistribution = new Map<number, number>();
    results.forEach(r => {
      usageDistribution.set(r.accountId, (usageDistribution.get(r.accountId) || 0) + 1);
    });
    
    console.log('\nDistribution d\'utilisation des comptes:');
    Array.from(usageDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([accountId, usageCount]) => {
        console.log(`- Compte ${accountId}: ${usageCount} utilisations (${(usageCount / TEST_ITERATIONS * 100).toFixed(1)}%)`);
      });
    
    // Vérifier si la distribution est équilibrée (mesure simple)
    const maxUsage = Math.max(...usageDistribution.values());
    const minUsage = Math.min(...usageDistribution.values());
    const usageRatio = maxUsage / minUsage;
    
    console.log(`\nRatio max/min d'utilisation: ${usageRatio.toFixed(2)}`);
    console.log(`Indice d'équilibrage: ${usageRatio <= 2 ? 'Bon' : usageRatio <= 3 ? 'Acceptable' : 'Déséquilibré'}`);
    
    // Analyse par niveau de risque
    const usageByRisk = {
      low: results.filter(r => r.riskLevel === 'low').length,
      medium: results.filter(r => r.riskLevel === 'medium').length,
      high: results.filter(r => r.riskLevel === 'high').length
    };
    
    console.log('\nDistribution par niveau de risque:');
    Object.entries(usageByRisk).forEach(([risk, count]) => {
      console.log(`- ${risk}: ${count} sélections`);
    });
    
    console.log('\n====== TEST TERMINÉ ======');
    
  } catch (error) {
    console.error('[ERREUR] Une erreur s\'est produite lors du test:', error);
  }
}

// Exécuter le test
testAccountRotation()
  .then(() => {
    console.log('Test de rotation terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors du test de rotation:', error);
    process.exit(1);
  });