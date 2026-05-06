/**
 * Test d'intégration du système complet ReviewFlow Automator
 * 
 * Ce script teste l'ensemble des composants du système pour s'assurer
 * que tout fonctionne correctement ensemble.
 */

import { storage } from './server/storage';
import { db } from './server/db';
import * as schema from './shared/schema';
import type { Proxy as ProxyType, PostingAccount, Business, Review } from './server/types';
import { proxyConfigService } from './server/services/proxy-config.service';
import { proxyService } from './server/services/proxy.service';
import { automationService } from './server/services/automation.service';
import { logger } from './server/services/logger.service';
import { accountRotationService } from './server/services/account-rotation.service';
import { securityManagerService } from './server/services/security-manager.service';
import * as fs from 'fs';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Type pour les résultats des tests
 */
type TestResult = {
  name: string;
  success: boolean;
  details?: any;
  error?: string;
};

/**
 * Classe principale de test
 */
class SystemIntegrationTester {
  private results: TestResult[] = [];
  private testBusiness: Business | null = null;
  private testAccount: PostingAccount | null = null;
  private testProxy: ProxyType | null = null;
  
  /**
   * Vérifie la configuration du système et les dépendances
   */
  async testSystemConfig(): Promise<TestResult> {
    try {
      console.log("\n=== Test de la configuration système ===");
      
      // Vérifier la configuration de PostgreSQL
      const dbConnected = await this.checkDatabaseConnection();
      console.log(`Base de données PostgreSQL: ${dbConnected ? "Connectée" : "Non connectée"}`);
      
      // Vérifier la configuration d'OpenAI
      const openaiConfigured = typeof process.env.OPENAI_API_KEY === 'string' && 
                               process.env.OPENAI_API_KEY.startsWith('sk-');
      console.log(`OpenAI API: ${openaiConfigured ? "Configurée" : "Non configurée"}`);
      
      // Vérifier la configuration de BrightData
      const brightdataConfigured = typeof process.env.BRIGHT_DATA_USERNAME === 'string' && 
                                  typeof process.env.BRIGHT_DATA_PASSWORD === 'string';
      console.log(`BrightData: ${brightdataConfigured ? "Configurée" : "Non configurée"}`);
      
      return {
        name: "Configuration Système",
        success: dbConnected && openaiConfigured && brightdataConfigured,
        details: {
          database: dbConnected,
          openai: openaiConfigured,
          brightdata: brightdataConfigured
        }
      };
    } catch (error) {
      console.error("Erreur lors du test de configuration:", error);
      return {
        name: "Configuration Système",
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }
  
  /**
   * Teste la connexion à la base de données PostgreSQL
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Tenter une requête simple
      await db.select({ count: db.fn.count() }).from(schema.users);
      return true;
    } catch (error) {
      console.error("Erreur de connexion à la base de données:", error);
      return false;
    }
  }
  
  /**
   * Teste les services de proxy
   */
  async testProxyServices(): Promise<TestResult> {
    try {
      console.log("\n=== Test des services de proxy ===");
      
      // Vérifier si des proxies existent dans la base
      const proxies = await db.select().from(schema.proxies);
      console.log(`Nombre de proxies dans la base: ${proxies.length}`);
      
      if (proxies.length === 0) {
        return {
          name: "Services de Proxy",
          success: false,
          error: "Aucun proxy trouvé dans la base de données"
        };
      }
      
      // Sauvegarder un proxy pour les tests futurs
      this.testProxy = proxies[0];
      
      // Tester le service de configuration de proxy
      const googleProxies = proxies.filter(p => 
        p.options && 
        (
          (p.options as any).google_kyc || 
          (p.options as any).google_optimize || 
          (p.options as any).google_access
        )
      );
      
      console.log(`Proxies optimisés pour Google: ${googleProxies.length}`);
      
      // Tester la génération d'URL optimisée
      if (googleProxies.length > 0) {
        const testProxy = googleProxies[0];
        const url = proxyConfigService.getOptimizedProxyUrl(testProxy, "google");
        const standardUrl = proxyConfigService.getOptimizedProxyUrl(testProxy);
        
        console.log("URL de proxy pour Google:", url);
        console.log("URL de proxy standard:", standardUrl);
        
        const hasGoogleOptimization = url.includes("google_kyc") || 
                                     url.includes("session=") ||
                                     url.includes("google_optimize");
        
        return {
          name: "Services de Proxy",
          success: true,
          details: {
            totalProxies: proxies.length,
            googleOptimizedProxies: googleProxies.length,
            optimizedUrl: url,
            hasGoogleOptimization
          }
        };
      }
      
      return {
        name: "Services de Proxy",
        success: proxies.length > 0,
        details: {
          totalProxies: proxies.length,
          googleOptimizedProxies: googleProxies.length
        }
      };
    } catch (error) {
      console.error("Erreur lors du test des services de proxy:", error);
      return {
        name: "Services de Proxy",
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }
  
  /**
   * Teste les services de comptes
   */
  async testAccountServices(): Promise<TestResult> {
    try {
      console.log("\n=== Test des services de comptes ===");
      
      // Vérifier si des comptes existent dans la base
      const accounts = await db.select().from(schema.postingAccounts);
      console.log(`Nombre de comptes dans la base: ${accounts.length}`);
      
      if (accounts.length === 0) {
        return {
          name: "Services de Comptes",
          success: false,
          error: "Aucun compte trouvé dans la base de données"
        };
      }
      
      // Compter les comptes par plateforme
      const googleAccounts = accounts.filter(a => a.platform === "google");
      const trustpilotAccounts = accounts.filter(a => a.platform === "trustpilot");
      const tripadvisorAccounts = accounts.filter(a => a.platform === "tripadvisor");
      
      console.log(`Comptes Google: ${googleAccounts.length}`);
      console.log(`Comptes Trustpilot: ${trustpilotAccounts.length}`);
      console.log(`Comptes TripAdvisor: ${tripadvisorAccounts.length}`);
      
      // Sauvegarder un compte pour les tests futurs
      this.testAccount = accounts.find(a => a.status === "active") || accounts[0];
      
      // Tester le service de rotation des comptes
      if (this.testAccount) {
        const accountInfo = await accountRotationService.getAccountInfo(this.testAccount.id);
        console.log("Info compte:", accountInfo);
      }
      
      return {
        name: "Services de Comptes",
        success: accounts.length > 0,
        details: {
          totalAccounts: accounts.length,
          byPlatform: {
            google: googleAccounts.length,
            trustpilot: trustpilotAccounts.length,
            tripadvisor: tripadvisorAccounts.length
          }
        }
      };
    } catch (error) {
      console.error("Erreur lors du test des services de comptes:", error);
      return {
        name: "Services de Comptes",
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }
  
  /**
   * Teste les services d'entreprises et d'avis
   */
  async testBusinessAndReviewServices(): Promise<TestResult> {
    try {
      console.log("\n=== Test des services d'entreprises et d'avis ===");
      
      // Vérifier si des entreprises existent dans la base
      const businesses = await db.select().from(schema.businesses);
      console.log(`Nombre d'entreprises dans la base: ${businesses.length}`);
      
      // Vérifier si des avis existent dans la base
      const reviews = await db.select().from(schema.reviews);
      console.log(`Nombre d'avis dans la base: ${reviews.length}`);
      
      // Sauvegarder une entreprise pour les tests futurs
      if (businesses.length > 0) {
        this.testBusiness = businesses[0];
        
        // Compter les avis pour cette entreprise
        const businessReviews = reviews.filter(r => r.businessId === this.testBusiness.id);
        console.log(`Avis pour l'entreprise ${this.testBusiness.name}: ${businessReviews.length}`);
      }
      
      return {
        name: "Services d'Entreprises et d'Avis",
        success: businesses.length > 0,
        details: {
          businesses: businesses.length,
          reviews: reviews.length
        }
      };
    } catch (error) {
      console.error("Erreur lors du test des services d'entreprises et d'avis:", error);
      return {
        name: "Services d'Entreprises et d'Avis",
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }
  
  /**
   * Exécute tous les tests et enregistre les résultats
   */
  async runAllTests(): Promise<void> {
    console.log("=== DÉBUT DES TESTS D'INTÉGRATION DU SYSTÈME ===\n");
    
    // Créer le répertoire des résultats
    await mkdirAsync('./test_reports', { recursive: true });
    
    // 1. Tester la configuration du système
    this.results.push(await this.testSystemConfig());
    
    // 2. Tester les services de proxy
    this.results.push(await this.testProxyServices());
    
    // 3. Tester les services de comptes
    this.results.push(await this.testAccountServices());
    
    // 4. Tester les services d'entreprises et d'avis
    this.results.push(await this.testBusinessAndReviewServices());
    
    // Enregistrer les résultats
    await this.saveResults();
    
    // Afficher un résumé
    this.showSummary();
  }
  
  /**
   * Enregistre les résultats des tests
   */
  private async saveResults(): Promise<void> {
    try {
      await writeFileAsync(
        './test_reports/system_integration_tests.json',
        JSON.stringify(this.results, null, 2)
      );
      console.log("\nRésultats enregistrés dans ./test_reports/system_integration_tests.json");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des résultats:", error);
    }
  }
  
  /**
   * Affiche un résumé des tests
   */
  private showSummary(): void {
    console.log("\n=== RÉSUMÉ DES TESTS ===");
    
    let totalSuccess = 0;
    for (const result of this.results) {
      console.log(`${result.name}: ${result.success ? "✅ SUCCÈS" : "❌ ÉCHEC"}`);
      if (result.error) {
        console.log(`  Erreur: ${result.error}`);
      }
      if (result.success) totalSuccess++;
    }
    
    const totalTests = this.results.length;
    console.log(`\n${totalSuccess}/${totalTests} tests réussis (${Math.round(totalSuccess/totalTests*100)}%)`);
  }
}

/**
 * Fonction principale
 */
async function main() {
  const tester = new SystemIntegrationTester();
  await tester.runAllTests();
}

// Exécuter le test
main()
  .then(() => {
    console.log("\n=== TESTS TERMINÉS ===");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erreur non gérée:", error);
    process.exit(1);
  });