/**
 * Script de test de génération de comptes en masse
 * 
 * Ce script teste la génération d'un petit nombre de comptes pour une plateforme
 * spécifiée afin de vérifier le bon fonctionnement du système de génération en masse.
 */

import { faker } from '@faker-js/faker';
import { db } from './server/db';
import { postingAccounts } from './shared/schema';
import { captchaService } from './server/services/captcha.service';
import { encryptionService } from './server/services/encryption.service';
import { proxyService } from './server/services/proxy.service';
import { logger } from './server/services/logger.service';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Fonction pour générer un user-agent aléatoire depuis une liste prédéfinie
function generateRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.2277.112',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Assurez-vous que puppeteer utilisera le plugin stealth
puppeteer.use(StealthPlugin());

// Types
type AccountGenerationResult = {
  success: boolean;
  email?: string;
  password?: string;
  platform: string;
  error?: string;
  proxy?: any;
  recoveryEmail?: string;
  phoneNumber?: string;
  creationIp?: string;
};

type BulkTestSummary = {
  platform: string;
  count: number;
  successful: number;
  failed: number;
  startTime: Date;
  endTime: Date;
  accounts: Array<{
    email: string;
    password: string;
    success: boolean;
    error?: string;
  }>;
};

// Configuration
const SUPPORTED_PLATFORMS = ['google', 'trustpilot', 'tripadvisor'];
const DEFAULT_PLATFORM = 'trustpilot';
const DEFAULT_COUNT = 3; // Nombre de comptes à créer par défaut pour les tests
const CONFIG = {
  SLEEP_BETWEEN_ACCOUNTS: 1 * 60 * 1000, // 1 minute entre chaque création
  SLEEP_VARIATION: 30 * 1000, // Variation aléatoire jusqu'à 30 secondes
  TEMP_DIR: './temp/bulk-test',
  TIMEOUT: 120000, // 2 minutes par défaut pour les opérations
};

/**
 * Classe pour tester la génération de comptes en masse
 */
class BulkAccountGeneratorTester {
  private platform: string;
  private count: number;
  private summary: BulkTestSummary;
  private writeFileAsync = promisify(fs.writeFile);
  private mkdirAsync = promisify(fs.mkdir);
  
  constructor(platform = DEFAULT_PLATFORM, count = DEFAULT_COUNT) {
    this.platform = platform;
    this.count = count;
    
    this.summary = {
      platform,
      count,
      successful: 0,
      failed: 0,
      startTime: new Date(),
      endTime: new Date(),
      accounts: []
    };
  }
  
  /**
   * Crée le répertoire temporaire si nécessaire
   */
  private async createTempDir() {
    try {
      await this.mkdirAsync(CONFIG.TEMP_DIR, { recursive: true });
      console.log(`📁 Répertoire ${CONFIG.TEMP_DIR} créé ou déjà existant.`);
    } catch (error) {
      console.error(`❌ Erreur lors de la création du répertoire ${CONFIG.TEMP_DIR}:`, error);
    }
  }
  
  /**
   * Génère un profil aléatoire
   */
  private async generateRandomProfile() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const email = faker.internet.email({ firstName, lastName });
    const password = `${faker.word.adjective()}${faker.number.int({ min: 100, max: 999 })}${faker.word.noun()}!`;
    const recoveryEmail = faker.internet.email();
    
    const birthYear = faker.number.int({ min: 1970, max: 2000 });
    const birthMonth = faker.number.int({ min: 1, max: 12 });
    const birthDay = faker.number.int({ min: 1, max: 28 });
    
    const phoneNumber = faker.phone.number();
    
    return {
      firstName,
      lastName,
      email,
      password,
      recoveryEmail,
      birthYear,
      birthMonth,
      birthDay,
      phoneNumber
    };
  }
  
  /**
   * Simule la création d'un compte
   */
  private async createAccount(retryCount: number = 0): Promise<AccountGenerationResult> {
    try {
      const profile = await this.generateRandomProfile();
      
      // Obtenir un proxy pour la création du compte
      const proxy = await proxyService.getOptimalProxy(this.platform);
      if (!proxy) {
        throw new Error('Aucun proxy disponible');
      }
      
      console.log(`📡 Utilisation du proxy: ${proxy.host}:${proxy.port}`);
      console.log(`👤 Profil - Email: ${profile.email}, Nom: ${profile.firstName} ${profile.lastName}`);
      
      // Configuration du navigateur
      const browserOptions = {
        headless: true,
        args: [
          `--proxy-server=${proxy.host}:${proxy.port}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      };
      
      let browser;
      let success = false;
      let error = '';
      
      try {
        console.log("⚙️ Lancement du navigateur avec proxy...");
        browser = await puppeteer.launch(browserOptions);
        
        // Créer une nouvelle page
        const page = await browser.newPage();
        
        // Configurer l'authentification proxy si nécessaire
        if (proxy.username && proxy.password) {
          await page.authenticate({
            username: proxy.username,
            password: proxy.password
          });
        }
        
        // Configuration d'un User-Agent réaliste
        const userAgent = generateRandomUserAgent();
        await page.setUserAgent(userAgent);
        
        // Définir un viewport réaliste
        await page.setViewport({ width: 1366, height: 768 });
        
        // Process spécifique à la plateforme
        switch (this.platform) {
          case 'google':
            // Implémenter la logique pour Google
            await this.simulateGoogleAccountCreation(page, profile);
            break;
          case 'trustpilot':
            // Implémenter la logique pour Trustpilot
            await this.simulateTrustpilotAccountCreation(page, profile);
            break;
          case 'tripadvisor':
            // Implémenter la logique pour TripAdvisor
            await this.simulateTripadvisorAccountCreation(page, profile);
            break;
          default:
            throw new Error(`Plateforme non supportée: ${this.platform}`);
        }
        
        // Si nous arrivons ici, c'est que la simulation a réussi
        success = true;
        console.log(`✅ Simulation de création de compte ${this.platform} réussie: ${profile.email}`);
        
        // Sauvegarder une capture d'écran pour vérification
        const screenshotPath = path.join(CONFIG.TEMP_DIR, `${this.platform}-account-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Capture d'écran sauvegardée: ${screenshotPath}`);
        
      } catch (err: any) {
        error = err.message || 'Erreur inconnue';
        console.error(`❌ Erreur: ${error}`);
      } finally {
        // Fermer le navigateur
        if (browser) {
          await browser.close();
        }
      }
      
      return {
        success,
        email: profile.email,
        password: profile.password,
        platform: this.platform,
        proxy,
        recoveryEmail: profile.recoveryEmail,
        phoneNumber: profile.phoneNumber,
        creationIp: proxy?.host,
        error: success ? undefined : error
      };
      
    } catch (error: any) {
      console.error(`❌ Erreur générale: ${error.message}`);
      return {
        success: false,
        platform: this.platform,
        error: error.message || 'Erreur générale inconnue'
      };
    }
  }
  
  /**
   * Simule la création d'un compte Google
   */
  private async simulateGoogleAccountCreation(page: any, profile: any) {
    console.log("🌐 Navigation vers la page d'inscription Google...");
    await page.goto('https://accounts.google.com/signup', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Vérifier si on est redirigé vers un captcha ou une page de blocage
    const currentUrl = page.url();
    if (currentUrl.includes('sorry/index') || currentUrl.includes('captcha')) {
      throw new Error('Bloqué par la protection anti-bot de Google');
    }
    
    // Première page: nom, prénom
    await page.waitForSelector('input[name="firstName"]', { timeout: 30000 });
    await page.type('input[name="firstName"]', profile.firstName, { delay: 100 });
    await page.type('input[name="lastName"]', profile.lastName, { delay: 100 });
    
    // Pour le test, nous n'allons pas compléter l'inscription complète
    console.log("✅ Simulation de l'inscription Google réussie");
  }
  
  /**
   * Simule la création d'un compte Trustpilot
   */
  private async simulateTrustpilotAccountCreation(page: any, profile: any) {
    console.log("🌐 Navigation vers la page d'inscription Trustpilot...");
    await page.goto('https://www.trustpilot.com/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Accepter les cookies si nécessaire
    try {
      const cookieButton = await page.$('button[data-cookie-consent-accept]');
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (cookieError) {
      console.log("Pas de bannière de cookies ou erreur lors de l'acceptation");
    }
    
    // Vérifier si on est redirigé vers un captcha ou une page de blocage
    const currentUrl = page.url();
    if (currentUrl.includes('captcha') || currentUrl.includes('blocked')) {
      throw new Error('Bloqué par la protection anti-bot de Trustpilot');
    }
    
    // Pour le test, nous n'allons pas compléter l'inscription complète
    console.log("✅ Simulation de l'accès à Trustpilot réussie");
  }
  
  /**
   * Simule la création d'un compte TripAdvisor
   */
  private async simulateTripadvisorAccountCreation(page: any, profile: any) {
    console.log("🌐 Navigation vers la page d'inscription TripAdvisor...");
    await page.goto('https://www.tripadvisor.com/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Accepter les cookies si nécessaire
    try {
      const cookieButton = await page.$('button#onetrust-accept-btn-handler');
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (cookieError) {
      console.log("Pas de bannière de cookies ou erreur lors de l'acceptation");
    }
    
    // Vérifier si on est redirigé vers un captcha ou une page de blocage
    const currentUrl = page.url();
    if (currentUrl.includes('captcha')) {
      throw new Error('Bloqué par la protection anti-bot de TripAdvisor');
    }
    
    // Pour le test, nous n'allons pas compléter l'inscription complète
    console.log("✅ Simulation de l'accès à TripAdvisor réussie");
  }
  
  /**
   * Stocke l'information du compte dans la base de données
   */
  private async storeAccountInDatabase(account: AccountGenerationResult): Promise<boolean> {
    try {
      // Chiffrer le mot de passe avant stockage
      const encryptedPassword = await encryptionService.encryptForStorage(account.password || '');
      
      // Insérer le compte dans la base de données - Marquer comme compte de test
      await db.insert(postingAccounts).values({
        platform: account.platform,
        email: account.email || '',
        password: encryptedPassword,
        creationIp: account.proxy?.host || account.creationIp || '',
        proxyId: account.proxy?.id,
        status: 'test', // Statut spécial pour les comptes de test
        accountConfidenceScore: 70,
        accountTier: 'test',
        activityPattern: 'test',
        priorityScore: 50,
        maxDailyUses: 2,
        maxConsecutiveUses: 2,
        reputationScore: 60,
        humanityScore: 70
      });
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du stockage du compte:', error);
      return false;
    }
  }
  
  /**
   * Pause entre les créations de compte
   */
  private async sleepBetweenAccounts() {
    // Ajouter une variation aléatoire pour éviter les patterns détectables
    const sleepTime = CONFIG.SLEEP_BETWEEN_ACCOUNTS + Math.random() * CONFIG.SLEEP_VARIATION;
    console.log(`⏱️ Pause de ${Math.round(sleepTime / 1000)} secondes avant la prochaine création...`);
    await new Promise(resolve => setTimeout(resolve, sleepTime));
  }
  
  /**
   * Génère les comptes de test
   */
  private async generateAccounts() {
    console.log(`\n===== TEST DE GÉNÉRATION DE ${this.count} COMPTES ${this.platform.toUpperCase()} =====\n`);
    
    let createdAccounts = 0;
    
    while (createdAccounts < this.count) {
      console.log(`\n🔄 Création du compte ${this.platform} ${createdAccounts + 1}/${this.count}`);
      
      const result = await this.createAccount();
      
      if (result.success) {
        this.summary.successful++;
        createdAccounts++;
        
        // Stocker le compte en base de données si demandé
        await this.storeAccountInDatabase(result);
      } else {
        this.summary.failed++;
      }
      
      // Ajouter le résultat au résumé
      this.summary.accounts.push({
        email: result.email || '',
        password: result.password || '',
        success: result.success,
        error: result.error
      });
      
      if (createdAccounts < this.count) {
        await this.sleepBetweenAccounts();
      }
    }
  }
  
  /**
   * Génère un rapport du test
   */
  private async generateReport() {
    this.summary.endTime = new Date();
    
    const duration = this.summary.endTime.getTime() - this.summary.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    let report = '\n\n=========== RAPPORT DE TEST DE CRÉATION DE COMPTES ===========\n\n';
    report += `Plateforme: ${this.summary.platform.toUpperCase()}\n`;
    report += `Nombre de comptes à créer: ${this.summary.count}\n`;
    report += `Comptes créés avec succès: ${this.summary.successful} (${Math.round(this.summary.successful / this.summary.count * 100)}%)\n`;
    report += `Échecs: ${this.summary.failed}\n`;
    report += `Durée totale: ${minutes} minute(s) et ${seconds} seconde(s)\n\n`;
    
    report += `Détails des comptes:\n`;
    this.summary.accounts.forEach((account, index) => {
      report += `\n[${index + 1}] Email: ${account.email}\n`;
      report += `    Mot de passe: ${account.password}\n`;
      report += `    Statut: ${account.success ? 'Succès' : 'Échec'}\n`;
      if (!account.success && account.error) {
        report += `    Erreur: ${account.error}\n`;
      }
    });
    
    report += '\n=====================================================\n';
    
    console.log(report);
    
    // Sauvegarder le rapport dans un fichier
    const reportPath = path.join(CONFIG.TEMP_DIR, `bulk-test-${this.platform}-${Date.now()}.txt`);
    await this.writeFileAsync(reportPath, report);
    console.log(`📄 Rapport sauvegardé dans ${reportPath}`);
    
    // Sauvegarder les données brutes en JSON
    const jsonPath = path.join(CONFIG.TEMP_DIR, `bulk-test-${this.platform}-${Date.now()}.json`);
    await this.writeFileAsync(jsonPath, JSON.stringify(this.summary, null, 2));
    console.log(`📄 Données brutes sauvegardées dans ${jsonPath}`);
  }
  
  /**
   * Exécute le test complet
   */
  public async run() {
    try {
      console.log(`🚀 Démarrage du test de génération de ${this.count} comptes ${this.platform}`);
      
      await this.createTempDir();
      await this.generateAccounts();
      await this.generateReport();
      
      console.log(`✅ Test de génération en masse terminé avec succès !`);
      return this.summary;
    } catch (error) {
      console.error(`❌ Erreur fatale lors du test:`, error);
      throw error;
    }
  }
}

/**
 * Fonction principale pour exécuter le test
 */
async function main() {
  try {
    // Récupérer les arguments de ligne de commande
    const args = process.argv.slice(2);
    const platform = args[0] || DEFAULT_PLATFORM;
    const count = parseInt(args[1]) || DEFAULT_COUNT;
    
    // Vérifier que la plateforme est supportée
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      console.error(`❌ Plateforme non supportée: ${platform}`);
      console.error(`📋 Plateformes supportées: ${SUPPORTED_PLATFORMS.join(', ')}`);
      process.exit(1);
    }
    
    // Vérifier que le nombre de comptes est raisonnable
    if (count <= 0 || count > 10) {
      console.error(`❌ Le nombre de comptes doit être entre 1 et 10 pour les tests`);
      process.exit(1);
    }
    
    console.log(`🔍 Configuration: plateforme=${platform}, comptes=${count}`);
    
    // Exécuter le test
    const tester = new BulkAccountGeneratorTester(platform, count);
    await tester.run();
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});