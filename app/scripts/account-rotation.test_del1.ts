/**
 * Test du système de rotation intelligente des comptes
 * 
 * Ce script teste le fonctionnement du système de rotation des comptes
 * en simulant différents scénarios d'utilisation et de sélection
 */
import { PostingAccount } from '@shared/schema';
import { storage } from '../storage';
import { accountRotationService } from '../services/account-rotation.service';
import { logger } from '../services/logger.service';

interface TestResult {
  name: string;
  success: boolean;
  details?: any;
  error?: string;
}

class AccountRotationTester {
  private results: TestResult[] = [];
  private testAccounts: PostingAccount[] = [];

  constructor() {}

  /**
   * Exécute tous les tests de rotation des comptes
   */
  public async runTests(): Promise<TestResult[]> {
    try {
      await this.setup();
      
      // Tests de sélection basiques
      await this.testSelectWithEmptyDatabase();
      await this.testSelectByRiskLevel();
      await this.testSelectByCountry();
      await this.testSelectWithRestPeriod();
      
      // Tests de scénarios avancés
      await this.testConsecutiveUsageLimit();
      await this.testRestPeriodActivation();
      await this.testReactivationAfterRest();

      // Nettoyage
      await this.cleanup();
      
      return this.results;
    } catch (error) {
      console.error('Erreur lors de l\'exécution des tests:', error);
      this.results.push({
        name: 'Test global',
        success: false,
        error: error.message
      });
      await this.cleanup();
      return this.results;
    }
  }

  /**
   * Initialisation des données de test
   */
  private async setup(): Promise<void> {
    try {
      // Créer différents comptes pour les tests
      await this.createTestAccounts();
      this.results.push({
        name: 'Création des comptes de test',
        success: true,
        details: {
          count: this.testAccounts.length
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Création des comptes de test',
        success: false,
        error: error.message
      });
      throw error; // Remonter l'erreur pour arrêter les tests
    }
  }

  /**
   * Crée des comptes de test avec diverses caractéristiques
   */
  private async createTestAccounts(): Promise<void> {
    // Compte standard jamais utilisé
    const account1 = await storage.createPostingAccount({
      platform: 'google',
      email: 'test1@example.com',
      password: 'password123',
      status: 'active',
      accountConfidenceScore: 70
    });
    
    // Compte avec historique d'utilisation
    const account2 = await storage.createPostingAccount({
      platform: 'google',
      email: 'test2@example.com',
      password: 'password123',
      status: 'active',
      lastUsed: new Date(Date.now() - 48 * 60 * 60 * 1000), // Il y a 2 jours
      consecutiveUses: 1,
      reviewCount: 1,
      accountConfidenceScore: 60
    });
    
    // Compte à haut risque (faible score de confiance)
    const account3 = await storage.createPostingAccount({
      platform: 'google',
      email: 'test3@example.com',
      password: 'password123',
      status: 'active',
      accountConfidenceScore: 30
    });
    
    // Compte avec pays spécifique
    const account4 = await storage.createPostingAccount({
      platform: 'google',
      email: 'test4@example.com',
      password: 'password123',
      status: 'active',
      lastUsedCountry: 'FR',
      accountConfidenceScore: 75
    });
    
    // Compte en période de repos
    const account5 = await storage.createPostingAccount({
      platform: 'google',
      email: 'test5@example.com',
      password: 'password123',
      status: 'active',
      restUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Repos jusqu'à demain
      consecutiveUses: 0,
      accountConfidenceScore: 65
    });
    
    // Compte trustpilot
    const account6 = await storage.createPostingAccount({
      platform: 'trustpilot',
      email: 'test6@example.com',
      password: 'password123',
      status: 'active',
      accountConfidenceScore: 80
    });
    
    this.testAccounts = [account1, account2, account3, account4, account5, account6];
  }

  /**
   * Nettoie les données de test
   */
  private async cleanup(): Promise<void> {
    // Dans un contexte de test, on peut simplement laisser expirer les données
    // ou utiliser une base de données temporaire
    // Si nécessaire, on pourrait supprimer explicitement les comptes ici
  }

  /**
   * Teste la sélection de compte quand aucun compte n'est disponible
   */
  private async testSelectWithEmptyDatabase(): Promise<void> {
    try {
      // Utiliser une plateforme qui n'existe pas dans nos données de test
      const account = await accountRotationService.selectOptimalAccount('linkedin');
      
      this.results.push({
        name: 'Sélection sans comptes disponibles',
        success: account === null,
        details: { account }
      });
    } catch (error) {
      this.results.push({
        name: 'Sélection sans comptes disponibles',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Teste la sélection basée sur le niveau de risque
   */
  private async testSelectByRiskLevel(): Promise<void> {
    try {
      // Test avec risque élevé (devrait privilégier les comptes à score élevé)
      const highRiskAccount = await accountRotationService.selectOptimalAccount('google', undefined, 'high');
      
      // Test avec risque faible (devrait équilibrer l'utilisation)
      const lowRiskAccount = await accountRotationService.selectOptimalAccount('google', undefined, 'low');
      
      this.results.push({
        name: 'Sélection par niveau de risque',
        success: highRiskAccount !== null && lowRiskAccount !== null,
        details: { 
          highRiskAccountId: highRiskAccount?.id,
          highRiskAccountScore: highRiskAccount?.accountConfidenceScore,
          lowRiskAccountId: lowRiskAccount?.id,
          areAccountsDifferent: highRiskAccount?.id !== lowRiskAccount?.id
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Sélection par niveau de risque',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Teste la sélection basée sur le pays préféré
   */
  private async testSelectByCountry(): Promise<void> {
    try {
      // Demander un compte pour la France (nous avons un compte test avec FR)
      const frenchAccount = await accountRotationService.selectOptimalAccount('google', 'FR');
      
      // Demander un compte pour un pays non disponible
      const germanAccount = await accountRotationService.selectOptimalAccount('google', 'DE');
      
      this.results.push({
        name: 'Sélection par pays',
        success: frenchAccount !== null && germanAccount !== null,
        details: { 
          frenchAccountId: frenchAccount?.id,
          frenchAccountCountry: frenchAccount?.lastUsedCountry,
          germanAccountId: germanAccount?.id,
          germanAccountCountry: germanAccount?.lastUsedCountry,
          isExpectedFrenchAccount: frenchAccount?.lastUsedCountry === 'FR'
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Sélection par pays',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Teste la prise en compte de la période de repos
   */
  private async testSelectWithRestPeriod(): Promise<void> {
    try {
      // Récupérer tous les comptes Google (devrait exclure celui en repos)
      const availableAccounts = await storage.getActivePostingAccounts('google');
      const restingAccount = this.testAccounts.find(a => a.restUntil && new Date(a.restUntil) > new Date());
      
      // Vérifier que la sélection ne retourne jamais le compte en repos
      const selectedAccount = await accountRotationService.selectOptimalAccount('google');
      const isRestingAccountSelected = selectedAccount?.id === restingAccount?.id;
      
      this.results.push({
        name: 'Respect des périodes de repos',
        success: !isRestingAccountSelected,
        details: { 
          availableAccountsCount: availableAccounts.length,
          restingAccountId: restingAccount?.id,
          selectedAccountId: selectedAccount?.id,
          isRestingAccountSelected
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Respect des périodes de repos',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Teste la limite d'utilisations consécutives
   */
  private async testConsecutiveUsageLimit(): Promise<void> {
    try {
      // Sélectionner un compte
      const account = await accountRotationService.selectOptimalAccount('google');
      if (!account) throw new Error('Aucun compte disponible');
      
      // Simuler plusieurs utilisations successives
      const initialUses = account.consecutiveUses;
      let currentUses = initialUses;
      
      for (let i = 0; i < 3; i++) {
        await accountRotationService.updateAccountUsageStats(account, true);
        currentUses++;
        
        // Récupérer l'état mis à jour du compte
        const updatedAccount = await storage.getPostingAccount(account.id);
        if (!updatedAccount) throw new Error(`Compte ${account.id} non trouvé`);
        
        if (updatedAccount.consecutiveUses !== currentUses && !updatedAccount.restUntil) {
          throw new Error(`Incohérence dans le compteur d'utilisations`);
        }
      }
      
      // Récupérer l'état final du compte
      const finalAccount = await storage.getPostingAccount(account.id);
      
      this.results.push({
        name: 'Limite d\'utilisations consécutives',
        success: finalAccount !== null,
        details: { 
          accountId: account.id,
          initialUses,
          finalUses: finalAccount?.consecutiveUses,
          restUntil: finalAccount?.restUntil
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Limite d\'utilisations consécutives',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Teste l'activation de la période de repos
   */
  private async testRestPeriodActivation(): Promise<void> {
    try {
      // Sélectionner un compte qui n'est pas encore en repos
      const account = await accountRotationService.selectOptimalAccount('google');
      if (!account) throw new Error('Aucun compte disponible');
      
      // Forcer le compte à atteindre sa limite d'utilisations
      const updates: Partial<PostingAccount> = {
        consecutiveUses: 3 // Valeur égale à MAX_CONSECUTIVE_USES
      };
      await storage.updatePostingAccount(account.id, updates);
      
      // Marquer une utilisation supplémentaire (devrait déclencher le repos)
      await accountRotationService.updateAccountUsageStats(account, true);
      
      // Vérifier si le compte est maintenant en repos
      const updatedAccount = await storage.getPostingAccount(account.id);
      
      this.results.push({
        name: 'Activation de la période de repos',
        success: updatedAccount !== null && updatedAccount.restUntil !== null,
        details: { 
          accountId: account.id,
          hasRestPeriod: updatedAccount?.restUntil !== null,
          restUntil: updatedAccount?.restUntil,
          newConsecutiveUses: updatedAccount?.consecutiveUses
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Activation de la période de repos',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Teste la réactivation après la période de repos
   */
  private async testReactivationAfterRest(): Promise<void> {
    try {
      // Récupérer ou créer un compte en repos
      let restingAccount = this.testAccounts.find(a => a.restUntil && new Date(a.restUntil) > new Date());
      
      if (!restingAccount) {
        // Créer un compte en repos qui doit se terminer bientôt
        restingAccount = await storage.createPostingAccount({
          platform: 'google',
          email: 'resting@example.com',
          password: 'password123',
          status: 'active',
          restUntil: new Date(Date.now() - 1000), // Période de repos déjà terminée
          consecutiveUses: 0,
          accountConfidenceScore: 65
        });
        this.testAccounts.push(restingAccount);
      } else {
        // Modifier le compte existant pour terminer sa période de repos
        await storage.updatePostingAccount(restingAccount.id, {
          restUntil: new Date(Date.now() - 1000) // Période de repos déjà terminée
        });
      }
      
      // Exécuter le processus de vérification des périodes de repos
      await accountRotationService.processAccountsRestPeriods();
      
      // Vérifier l'état du compte
      const updatedAccount = await storage.getPostingAccount(restingAccount.id);
      
      this.results.push({
        name: 'Réactivation après période de repos',
        success: updatedAccount !== null && updatedAccount.restUntil === null,
        details: { 
          accountId: restingAccount.id,
          initialRestUntil: restingAccount.restUntil,
          finalRestUntil: updatedAccount?.restUntil
        }
      });
    } catch (error) {
      this.results.push({
        name: 'Réactivation après période de repos',
        success: false,
        error: error.message
      });
    }
  }
}

// Fonction principale pour exécuter les tests
async function runAccountRotationTests() {
  console.log('Démarrage des tests de rotation des comptes...');
  
  const tester = new AccountRotationTester();
  const results = await tester.runTests();
  
  // Afficher un récapitulatif des résultats
  console.log('\n===== Résultats des tests de rotation des comptes =====');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.name}`);
      successCount++;
    } else {
      console.log(`❌ ${result.name}: ${result.error || 'Échec'}`);
      failureCount++;
    }
  }
  
  console.log(`\nTotal: ${results.length} tests, ${successCount} réussis, ${failureCount} échoués`);
  
  // Enregistrer les résultats dans les logs
  await logger.log('account_rotation_tests', {
    total: results.length,
    success: successCount,
    failure: failureCount,
    detail: results
  });
}

// Exécuter les tests si ce script est lancé directement
if (require.main === module) {
  // S'assurer que la base de données est initialisée avec le stockage PostgreSQL
  import('../db').then(async ({ initializeDatabase }) => {
    await initializeDatabase();
    await runAccountRotationTests();
    process.exit(0);
  }).catch(error => {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  });
}

export { runAccountRotationTests, AccountRotationTester };