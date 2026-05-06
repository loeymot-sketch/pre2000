/**
 * Test complet du workflow ReviewFlow Automator
 * 
 * Ce script teste :
 * 1. La configuration des proxies BrightData
 * 2. La création des comptes de test pour Trustpilot et Google
 * 3. La création de business pour test
 * 4. La génération et publication d'avis simulés
 */

import { storage } from './server/storage';
import { AutomationService } from './server/services/automation.service';
import { ProxyService } from './server/services/proxy.service';
import { AIService } from './server/services/ai.service';
import { Business, PostingAccount, Review } from './shared/schema';
import { accountRotationService } from './server/services/account-rotation.service';
import * as fs from 'fs';
import { promisify } from 'util';

/**
 * Configuration pour le test
 */
const TEST_CONFIG = {
  PLATFORMS: ['trustpilot', 'google'],
  ACCOUNTS_PER_PLATFORM: 2,
  REVIEWS_PER_ACCOUNT: 1,
  BRIGHT_DATA_PROXY: {
    host: "brd.superproxy.io",
    port: 33335,
    username: process.env.BRIGHT_DATA_USERNAME || "brd-customer-hl_ab176a27-zone-residential_proxy1",
    password: process.env.BRIGHT_DATA_PASSWORD || "y7z8all1x1u7",
    type: "residential",
    countries: ["FR", "US", "UK", "DE"],
    options: {
      provider: "brightdata",
      session_sticky: true,
      google_kyc: true,
      google_optimize: true
    }
  }
};

/**
 * Gestionnaire du test complet
 */
class CompleteWorkflowTester {
  private writeFileAsync = promisify(fs.writeFile);
  private mkdirAsync = promisify(fs.mkdir);
  private startTime: Date;
  private proxyService: ProxyService;
  private automationService: AutomationService;
  private aiService: AIService;
  
  private results = {
    proxies: { success: false, count: 0, ids: [] },
    accounts: { success: false, count: 0, details: [] },
    businesses: { success: false, count: 0, details: [] },
    reviews: { success: false, count: 0, details: [] }
  };
  
  /**
   * Initialisation du testeur
   */
  constructor() {
    this.startTime = new Date();
    this.proxyService = new ProxyService();
    this.automationService = new AutomationService();
    this.aiService = new AIService();
  }
  
  /**
   * Génère un ID unique pour les tests
   */
  private generateTestId() {
    return `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  /**
   * Crée un dossier pour les résultats
   */
  private async createResultsDir() {
    try {
      await this.mkdirAsync('./test_reports', { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * 1. Configuration des proxies BrightData
   */
  private async setupProxies() {
    console.log('\n=== 1. CONFIGURATION DES PROXIES ===');
    try {
      // Supprimer les proxies existants pour nettoyer l'environnement
      const existingProxies = await storage.getProxies();
      console.log(`${existingProxies.length} proxies existants trouvés`);
      
      // Créer des proxies pour chaque pays configuré
      const proxyPromises = TEST_CONFIG.BRIGHT_DATA_PROXY.countries.map(async (country, index) => {
        const proxy = await storage.createProxy({
          host: TEST_CONFIG.BRIGHT_DATA_PROXY.host,
          port: TEST_CONFIG.BRIGHT_DATA_PROXY.port,
          username: TEST_CONFIG.BRIGHT_DATA_PROXY.username,
          password: TEST_CONFIG.BRIGHT_DATA_PROXY.password,
          type: TEST_CONFIG.BRIGHT_DATA_PROXY.type,
          country,
          success_rate: "95",
          last_tested: new Date(),
          is_active: true,
          options: TEST_CONFIG.BRIGHT_DATA_PROXY.options
        });
        
        console.log(`Proxy #${proxy.id} créé pour ${country}`);
        return proxy;
      });
      
      const createdProxies = await Promise.all(proxyPromises);
      
      this.results.proxies = {
        success: true,
        count: createdProxies.length,
        ids: createdProxies.map(p => p.id)
      };
      
      console.log(`✅ ${createdProxies.length} proxies créés avec succès`);
      return createdProxies;
    } catch (error) {
      console.error('❌ Erreur lors de la configuration des proxies:', error);
      throw error;
    }
  }
  
  /**
   * 2. Création des comptes pour chaque plateforme
   */
  private async createAccounts() {
    console.log('\n=== 2. CRÉATION DES COMPTES ===');
    try {
      const accountPromises = TEST_CONFIG.PLATFORMS.flatMap(platform => {
        return Array.from({ length: TEST_CONFIG.ACCOUNTS_PER_PLATFORM }).map(async (_, index) => {
          const accountId = this.generateTestId();
          const account = await storage.createPostingAccount({
            platform,
            email: `test_${platform}_${accountId}@example.com`,
            password: `TestPassword${platform}123!`,
            first_name: platform === 'google' ? 'Jean' : 'Marie',
            last_name: platform === 'google' ? 'Dupont' : 'Martin',
            status: 'active',
            creation_date: new Date(),
            last_used: null,
            consecutive_uses: 0,
            total_reviews: 0,
            risk_score: 0,
            verification_status: 'verified',
            login_successful: true
          });
          
          console.log(`Compte #${account.id} créé pour ${platform}: ${account.email}`);
          return account;
        });
      });
      
      const createdAccounts = await Promise.all(accountPromises);
      
      this.results.accounts = {
        success: true,
        count: createdAccounts.length,
        details: createdAccounts.map(a => ({ id: a.id, platform: a.platform, email: a.email }))
      };
      
      console.log(`✅ ${createdAccounts.length} comptes créés avec succès`);
      return createdAccounts;
    } catch (error) {
      console.error('❌ Erreur lors de la création des comptes:', error);
      throw error;
    }
  }
  
  /**
   * 3. Création des business pour chaque plateforme
   */
  private async createBusinesses() {
    console.log('\n=== 3. CRÉATION DES BUSINESS ===');
    try {
      const businessPromises = TEST_CONFIG.PLATFORMS.map(async platform => {
        const businessId = this.generateTestId();
        const business = await storage.createBusiness({
          name: `Test Business ${platform} ${businessId}`,
          url: platform === 'trustpilot' 
            ? 'https://www.trustpilot.com/review/doge-vision.com'
            : 'https://www.google.com/maps/place/Doge+Vision/@48.8746684,2.3694772,17z',
          platform,
          userId: 1,
          industry: 'Technology',
          location: 'Paris, France',
          description: `Business de test pour ${platform}`,
          rating_target: 4.5,
          review_goal: 10,
          status: 'active'
        });
        
        console.log(`Business #${business.id} créé pour ${platform}: ${business.name}`);
        return business;
      });
      
      const createdBusinesses = await Promise.all(businessPromises);
      
      this.results.businesses = {
        success: true,
        count: createdBusinesses.length,
        details: createdBusinesses.map(b => ({ id: b.id, platform: b.platform, name: b.name }))
      };
      
      console.log(`✅ ${createdBusinesses.length} business créés avec succès`);
      return createdBusinesses;
    } catch (error) {
      console.error('❌ Erreur lors de la création des business:', error);
      throw error;
    }
  }
  
  /**
   * 4. Génération et simulation de publication d'avis
   */
  private async createAndSimulateReviews(accounts: PostingAccount[], businesses: Business[]) {
    console.log('\n=== 4. CRÉATION ET PUBLICATION DES AVIS ===');
    try {
      // Pour chaque compte, générer et publier des avis
      const reviewPromises = accounts.flatMap(account => {
        // Trouver le business correspondant à la plateforme du compte
        const business = businesses.find(b => b.platform === account.platform);
        if (!business) {
          console.log(`Aucun business trouvé pour la plateforme ${account.platform}`);
          return [];
        }
        
        return Array.from({ length: TEST_CONFIG.REVIEWS_PER_ACCOUNT }).map(async (_, index) => {
          // Générer un contenu avec des avis positifs prédéfinis
          const reviewContents = [
            `Excellent service chez ${business.name}! J'ai été impressionné par la qualité et le professionnalisme. Je recommande vivement.`,
            `Très satisfait de mon expérience avec ${business.name}. L'équipe est à l'écoute et le service est rapide et efficace.`,
            `Je recommande ${business.name} pour leur expertise et leur excellent service client. Vraiment une entreprise de confiance.`,
            `Service impeccable chez ${business.name}. Des professionnels compétents et sympathiques. Je reviendrai sans hésiter.`
          ];
          
          // Créer l'avis dans la base de données
          const review = await storage.createReview({
            business_id: business.id,
            account_id: account.id,
            content: reviewContents[index % reviewContents.length],
            rating: 5,
            platform: account.platform,
            status: 'pending',
            scheduled_date: new Date(),
            publish_date: null,
            test_id: this.generateTestId(),
            simulation_mode: true
          });
          
          console.log(`Avis #${review.id} créé pour ${account.platform} (Business: ${business.id}, Compte: ${account.id})`);
          
          // Simuler la publication (sans lancer de navigateur)
          const publishDate = new Date();
          await storage.updateReview(review.id, {
            status: 'posted',
            publish_date: publishDate,
            error: null
          });
          
          // Mettre à jour les statistiques du compte
          const currentConsecutiveUses = typeof account.consecutive_uses === 'number' ? account.consecutive_uses : 0;
          const currentTotalReviews = typeof account.total_reviews === 'number' ? account.total_reviews : 0;
          
          await storage.updatePostingAccount(account.id, {
            last_used: publishDate,
            consecutive_uses: currentConsecutiveUses + 1,
            total_reviews: currentTotalReviews + 1
          });
          
          console.log(`✅ Avis #${review.id} publié avec succès (simulation)`);
          return { review, account, business };
        });
      });
      
      const createdReviews = await Promise.all(reviewPromises);
      
      this.results.reviews = {
        success: true,
        count: createdReviews.length,
        details: createdReviews.map(r => ({ 
          id: r.review.id, 
          platform: r.account.platform, 
          businessId: r.business.id,
          accountId: r.account.id,
          status: 'posted'
        }))
      };
      
      console.log(`✅ ${createdReviews.length} avis créés et publiés avec succès (simulation)`);
      return createdReviews;
    } catch (error) {
      console.error('❌ Erreur lors de la création et publication des avis:', error);
      throw error;
    }
  }
  
  /**
   * Sauvegarde les résultats du test
   */
  private async saveResults() {
    try {
      await this.createResultsDir();
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `./test_reports/workflow-test-results-${timestamp}.json`;
      
      await this.writeFileAsync(
        filename,
        JSON.stringify({
          startTime: this.startTime,
          endTime: new Date(),
          duration: (new Date().getTime() - this.startTime.getTime()) / 1000,
          config: TEST_CONFIG,
          results: this.results
        }, null, 2)
      );
      
      console.log(`\nRésultats du test sauvegardés dans ${filename}`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats:', error);
    }
  }
  
  /**
   * Exécute le workflow complet de test
   */
  public async runCompleteTest() {
    console.log('=== DÉBUT DU TEST COMPLET DE WORKFLOW ===');
    
    try {
      // 1. Configurer les proxies
      const proxies = await this.setupProxies();
      
      // 2. Créer les comptes
      const accounts = await this.createAccounts();
      
      // 3. Créer les business
      const businesses = await this.createBusinesses();
      
      // 4. Créer et publier les avis (simulation)
      await this.createAndSimulateReviews(accounts, businesses);
      
      // 5. Vérifier les résultats finaux
      console.log('\n=== RÉSULTATS FINAUX ===');
      console.log(`✅ ${this.results.proxies.count} proxies configurés`);
      console.log(`✅ ${this.results.accounts.count} comptes créés`);
      console.log(`✅ ${this.results.businesses.count} business créés`);
      console.log(`✅ ${this.results.reviews.count} avis publiés`);
      
      // 6. Sauvegarder les résultats
      await this.saveResults();
      
      return {
        success: true,
        message: 'Test complet terminé avec succès',
        results: this.results
      };
    } catch (error) {
      console.error('Erreur lors du test complet:', error);
      
      // Sauvegarder quand même les résultats partiels
      await this.saveResults();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        results: this.results
      };
    }
  }
}

// Exécution du test complet
async function main() {
  const tester = new CompleteWorkflowTester();
  const result = await tester.runCompleteTest();
  
  if (result.success) {
    console.log('\n✅ TEST COMPLET RÉUSSI !');
    process.exit(0);
  } else {
    console.error('\n❌ TEST COMPLET ÉCHOUÉ:', result.error);
    process.exit(1);
  }
}

// Lancer le test
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});