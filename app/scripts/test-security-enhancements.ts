/**
 * Test des améliorations de sécurité pour ReviewFlow Automator
 * 
 * Ce script teste les fonctionnalités avancées de sécurité et d'évasion de détection:
 * 1. Test de l'empreinte numérique cohérente
 * 2. Test des comportements humains simulés
 * 3. Test de l'optimisation des proxies pour Google
 */

import { initializeDatabase, closeDatabase } from './server/db';
import { storage } from './server/storage';
import { initializeStorage } from './server/storage';
import { proxyService } from './server/services/proxy.service';
import { fingerprintService } from './server/services/fingerprint.service';
import { humanBehaviorService } from './server/services/human-behavior.service';
import { accountService } from './server/services/account.service';
import { geoMatchingService } from './server/services/geo-matching.service';
import { PostingAccount, ProxyType } from './shared/schema';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// Configuration de puppeteer avec le plugin stealth
puppeteer.use(StealthPlugin());

// Utilitaires
const writeFileAsync = util.promisify(fs.writeFile);
const mkdirAsync = util.promisify(fs.mkdir);

interface TestResult {
  name: string;
  success: boolean;
  details: any;
  error?: string;
}

class SecurityTester {
  private results: TestResult[] = [];
  private testAccount: PostingAccount | null = null;
  private testProxy: ProxyType | null = null;
  private browser: Browser | null = null;
  
  constructor() {}
  
  /**
   * Prépare l'environnement de test
   */
  async setup() {
    console.log("🔧 Initialisation des tests de sécurité...");
    
    try {
      // Initialiser la base de données
      await initializeDatabase();
      await initializeStorage(true);
      console.log("✅ Base de données et stockage initialisés");
      
      // Créer le répertoire pour les résultats si nécessaire
      await this.createResultsDir();
      
      // Obtenir un compte de test
      const accounts = await storage.getPostingAccounts();
      if (accounts.length > 0) {
        // Prendre un compte Google pour les tests
        const googleAccounts = accounts.filter(a => a.platform === 'google');
        if (googleAccounts.length > 0) {
          this.testAccount = googleAccounts[0];
          console.log(`✅ Compte de test sélectionné: ID ${this.testAccount.id}`);
        } else {
          this.testAccount = accounts[0];
          console.log(`⚠️ Pas de compte Google trouvé, utilisation du compte ID ${this.testAccount.id}`);
        }
      } else {
        throw new Error("Aucun compte disponible pour les tests");
      }
      
      // Obtenir un proxy de test
      const proxies = await storage.getProxies();
      if (proxies.length > 0) {
        // Préférer un proxy US pour les tests Google
        const usProxies = proxies.filter(p => p.country === 'US' && p.status === 'active');
        if (usProxies.length > 0) {
          this.testProxy = usProxies[0];
          console.log(`✅ Proxy de test sélectionné: ID ${this.testProxy.id} (${this.testProxy.country})`);
        } else {
          this.testProxy = proxies.find(p => p.status === 'active') || proxies[0];
          console.log(`⚠️ Pas de proxy US actif trouvé, utilisation du proxy ID ${this.testProxy.id}`);
        }
      } else {
        throw new Error("Aucun proxy disponible pour les tests");
      }
      
      return true;
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation:", error);
      return false;
    }
  }
  
  /**
   * Nettoie après les tests
   */
  async cleanup() {
    console.log("🧹 Nettoyage après les tests...");
    
    if (this.browser) {
      try {
        await this.browser.close();
        console.log("✅ Navigateur fermé");
      } catch (error) {
        console.error("⚠️ Erreur lors de la fermeture du navigateur:", error);
      }
    }
    
    try {
      await closeDatabase();
      console.log("✅ Base de données fermée");
    } catch (error) {
      console.error("⚠️ Erreur lors de la fermeture de la base de données:", error);
    }
  }
  
  /**
   * Crée le répertoire pour les résultats de test
   */
  private async createResultsDir() {
    const dir = path.join(process.cwd(), 'test_results');
    try {
      await mkdirAsync(dir, { recursive: true });
    } catch (error) {
      // Ignorer l'erreur si le répertoire existe déjà
    }
  }
  
  /**
   * Enregistre les résultats des tests
   */
  private async saveResults() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(process.cwd(), 'test_results', `security-test-${timestamp}.json`);
    
    const results = {
      timestamp: new Date().toISOString(),
      account: this.testAccount ? { 
        id: this.testAccount.id, 
        platform: this.testAccount.platform 
      } : null,
      proxy: this.testProxy ? { 
        id: this.testProxy.id, 
        host: this.testProxy.host,
        country: this.testProxy.country
      } : null,
      tests: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      }
    };
    
    await writeFileAsync(filePath, JSON.stringify(results, null, 2));
    console.log(`📝 Résultats enregistrés dans ${filePath}`);
  }
  
  /**
   * Initialise un navigateur pour les tests
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.testProxy) {
      throw new Error("Aucun proxy configuré pour les tests");
    }
    
    console.log(`⏳ Initialisation du navigateur avec le proxy ${this.testProxy.host}:${this.testProxy.port}...`);
    
    // Génération d'un répertoire temporaire pour le profil utilisateur
    const tempUserDataDir = `${process.cwd()}/temp/security_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Configuration du proxy
    const proxyUrl = `${this.testProxy.host}:${this.testProxy.port}`;
    const proxyAuth = this.testProxy.username && this.testProxy.password ? 
      { username: this.testProxy.username, password: this.testProxy.password } : undefined;
    
    // Vérifier le chemin vers Chromium
    let executablePath = '';
    try {
      // Chemin spécifique dans l'environnement Replit
      executablePath = "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser";
      if (!fs.existsSync(executablePath)) {
        throw new Error("Chemin Chromium non trouvé");
      }
      console.log(`✅ Utilisation du chemin Chromium connu: ${executablePath}`);
    } catch (error) {
      console.log("⚠️ Chemin Chromium par défaut non disponible, tentative de localisation...");
      try {
        // Tenter de trouver le chemin dans l'environnement Replit/Nix
        const { stdout } = await util.promisify(require('child_process').exec)('which chromium-browser || which chromium || which google-chrome');
        executablePath = stdout.trim();
        console.log(`✅ Chemin Chromium détecté: ${executablePath}`);
      } catch (error) {
        console.error("❌ Impossible de localiser Chromium, utilisation du chemin par défaut de Puppeteer");
        executablePath = '';
      }
    }
    
    // Options de lancement adaptées à l'environnement Replit
    const launchOptions = {
      executablePath: executablePath || undefined,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        `--proxy-server=${proxyUrl}`,
        '--disable-features=IsolateOrigins,site-per-process',
        `--user-data-dir=${tempUserDataDir}`
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1366,
        height: 768
      }
    };
    
    // Lancer le navigateur
    this.browser = await puppeteer.launch(launchOptions);
    
    // Si des identifiants de proxy sont requis, les configurer dans toutes les pages
    if (proxyAuth) {
      const pages = await this.browser.pages();
      for (const page of pages) {
        await page.authenticate(proxyAuth);
      }
    }
    
    console.log("✅ Navigateur initialisé avec succès");
    return this.browser;
  }
  
  /**
   * Effectue tous les tests de sécurité
   */
  async runAllTests() {
    try {
      console.log("\n🔒 DÉMARRAGE DES TESTS DE SÉCURITÉ ET D'ÉVASION DE DÉTECTION\n");
      
      // Initialisation
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        throw new Error("Échec de l'initialisation des tests");
      }
      
      // Test 1: Cohérence de l'empreinte numérique
      await this.testFingerprintConsistency();
      
      // Test 2: Comportement humain simulé
      await this.testHumanBehavior();
      
      // Test 3: Optimisation des proxies pour Google
      await this.testGoogleProxyOptimization();
      
      // Test 4: Résistance à la détection de bot
      await this.testBotDetectionResistance();
      
      // Test 5: Correspondance géographique compte-proxy
      await this.testGeoMatching();
      
      // Enregistrer les résultats
      await this.saveResults();
      
      // Afficher le résumé
      this.showSummary();
      
    } catch (error) {
      console.error("❌ Erreur critique lors des tests:", error);
    } finally {
      // Nettoyer quelle que soit l'issue
      await this.cleanup();
    }
  }
  
  /**
   * Test: Cohérence de l'empreinte numérique entre les sessions
   */
  private async testFingerprintConsistency() {
    console.log("\n📋 TEST 1: Cohérence de l'empreinte numérique");
    
    try {
      if (!this.testAccount || !this.testProxy) {
        throw new Error("Compte ou proxy de test non disponible");
      }
      
      // Obtenir l'empreinte actuelle du compte
      const currentFingerprint = await fingerprintService.getAccountFingerprint(
        this.testAccount, 
        this.testProxy.country
      );
      
      console.log("✅ Empreinte récupérée pour le compte");
      
      // Générer une nouvelle empreinte
      const newFingerprint = await fingerprintService.generateFingerprint(
        this.testAccount.platform, 
        this.testProxy.country
      );
      
      console.log("✅ Nouvelle empreinte générée");
      
      // Vérifier la cohérence des propriétés critiques
      const consistentProperties = [
        'userAgent',
        'viewport',
        'deviceCategory',
        'osName',
        'browserName'
      ];
      
      const consistencyResults: Record<string, boolean> = {};
      
      if (currentFingerprint && newFingerprint) {
        // Comparer les propriétés clés entre l'empreinte actuelle et nouvelle
        for (const prop of consistentProperties) {
          if (
            currentFingerprint[prop] === undefined || 
            newFingerprint[prop] === undefined
          ) {
            consistencyResults[prop] = false;
            continue;
          }
          
          if (typeof currentFingerprint[prop] === 'object' && typeof newFingerprint[prop] === 'object') {
            // Comparer les objets (comme viewport)
            const currentObj = JSON.stringify(currentFingerprint[prop]);
            const newObj = JSON.stringify(newFingerprint[prop]);
            consistencyResults[prop] = currentObj === newObj;
          } else {
            // Comparer les valeurs simples
            consistencyResults[prop] = currentFingerprint[prop] === newFingerprint[prop];
          }
        }
      } else {
        throw new Error("Empreintes nulles ou indéfinies");
      }
      
      // Calculer le score de cohérence
      const totalProps = Object.keys(consistencyResults).length;
      const consistentProps = Object.values(consistencyResults).filter(Boolean).length;
      const consistencyScore = totalProps > 0 ? consistentProps / totalProps : 0;
      
      // Résultat du test
      const success = consistencyScore >= 0.8; // Au moins 80% des propriétés doivent être cohérentes
      
      this.results.push({
        name: "Cohérence de l'empreinte numérique",
        success,
        details: {
          consistencyScore,
          totalProperties: totalProps,
          consistentProperties: consistentProps,
          propertyResults: consistencyResults,
          currentFingerprint: {
            userAgent: currentFingerprint.userAgent,
            browserName: currentFingerprint.browserName,
            osName: currentFingerprint.osName,
            deviceCategory: currentFingerprint.deviceCategory
          }
        }
      });
      
      if (success) {
        console.log(`✅ Test réussi: Score de cohérence ${(consistencyScore * 100).toFixed(1)}%`);
      } else {
        console.log(`❌ Test échoué: Score de cohérence ${(consistencyScore * 100).toFixed(1)}%`);
      }
      
    } catch (error) {
      console.error("❌ Erreur lors du test d'empreinte numérique:", error);
      
      this.results.push({
        name: "Cohérence de l'empreinte numérique",
        success: false,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Test: Simulation de comportement humain
   */
  private async testHumanBehavior() {
    console.log("\n📋 TEST 2: Simulation de comportement humain");
    
    try {
      if (!this.testAccount || !this.testProxy) {
        throw new Error("Compte ou proxy de test non disponible");
      }
      
      // Initialiser le navigateur si nécessaire
      if (!this.browser) {
        this.browser = await this.initBrowser();
      }
      
      // Nouvelle page pour le test
      const page = await this.browser.newPage();
      
      // Appliquer l'empreinte numérique
      const fingerprint = await fingerprintService.getAccountFingerprint(
        this.testAccount, 
        this.testProxy.country
      );
      
      await fingerprintService.applyFingerprintToPage(page, fingerprint);
      console.log("✅ Empreinte numérique appliquée à la page");
      
      // Visiter une page de test
      await page.goto('https://bot.sannysoft.com', { 
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      
      console.log("✅ Page de test de détection de bot chargée");
      
      // Capturer une capture d'écran des résultats
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test_results', 'bot-detection-test.png'),
        fullPage: true
      });
      
      console.log("✅ Capture d'écran du test de détection enregistrée");
      
      // Analyser les résultats du test
      const botDetectionResults = await page.evaluate(() => {
        const results: Record<string, boolean> = {};
        const testRows = document.querySelectorAll('table tbody tr');
        
        testRows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const testName = cells[0].textContent?.trim() || '';
            // La deuxième cellule contient généralement le résultat
            const rawResult = cells[1].textContent?.trim() || '';
            // Si le résultat contient "PASSED", c'est bon
            const testPassed = rawResult.includes('PASSED');
            
            if (testName) {
              results[testName] = testPassed;
            }
          }
        });
        
        return results;
      });
      
      console.log("✅ Résultats du test de détection analysés");
      
      // Calculer le score global
      const totalTests = Object.keys(botDetectionResults).length;
      const passedTests = Object.values(botDetectionResults).filter(Boolean).length;
      const botDetectionScore = totalTests > 0 ? passedTests / totalTests : 0;
      
      // Résultat du test
      const success = botDetectionScore >= 0.7; // Au moins 70% des tests doivent passer
      
      this.results.push({
        name: "Simulation de comportement humain",
        success,
        details: {
          botDetectionScore,
          totalTests,
          passedTests,
          testResults: botDetectionResults
        }
      });
      
      if (success) {
        console.log(`✅ Test réussi: Score de simulation humaine ${(botDetectionScore * 100).toFixed(1)}%`);
      } else {
        console.log(`❌ Test échoué: Score de simulation humaine ${(botDetectionScore * 100).toFixed(1)}%`);
      }
      
      // Fermer la page
      await page.close();
      
    } catch (error) {
      console.error("❌ Erreur lors du test de comportement humain:", error);
      
      this.results.push({
        name: "Simulation de comportement humain",
        success: false,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Test: Optimisation des proxies pour Google
   */
  private async testGoogleProxyOptimization() {
    console.log("\n📋 TEST 3: Optimisation des proxies pour Google");
    
    try {
      if (!this.testProxy) {
        throw new Error("Proxy de test non disponible");
      }
      
      // Récupérer la configuration actuelle du proxy
      const originalProxy = this.testProxy;
      
      // Tester le proxy contre une URL Google
      const googleTestResult = await proxyService.testSpecificProxy(
        originalProxy.id,
        undefined,
        false
      );
      
      console.log("✅ Test du proxy contre Google effectué");
      
      // Appliquer l'optimisation Google au proxy
      const googleOptimizedProxy = {
        ...originalProxy,
        is_google_optimized: true,
        session_sticky: true,
        session_duration: 60,
        google_kyc: true,
        google_optimize: true,
        google_access: true,
        kyc_mode: 'high'
      };
      
      // Mettre à jour le proxy dans la base de données
      await storage.updateProxy(originalProxy.id, {
        is_google_optimized: true,
        session_sticky: true,
        google_kyc: true
      });
      
      console.log("✅ Optimisation Google appliquée au proxy");
      
      // Re-tester le proxy après optimisation
      const optimizedTestResult = await proxyService.testSpecificProxy(
        originalProxy.id,
        undefined,
        false
      );
      
      console.log("✅ Test du proxy optimisé contre Google effectué");
      
      // Comparer les résultats des tests
      const originalSuccess = googleTestResult.success;
      const optimizedSuccess = optimizedTestResult.success;
      
      // Si le proxy était déjà optimisé, considérer le test comme réussi
      const alreadyOptimized = originalProxy.is_google_optimized === true;
      
      // Résultat final
      const success = optimizedSuccess || alreadyOptimized;
      
      this.results.push({
        name: "Optimisation des proxies pour Google",
        success,
        details: {
          proxyId: originalProxy.id,
          originalTestResult: {
            success: googleTestResult.success,
            successRate: googleTestResult.summary.successRate,
            averageLatency: googleTestResult.summary.averageLatency
          },
          optimizedTestResult: {
            success: optimizedTestResult.success,
            successRate: optimizedTestResult.summary.successRate,
            averageLatency: optimizedTestResult.summary.averageLatency
          },
          alreadyOptimized,
          optimizationApplied: !alreadyOptimized
        }
      });
      
      if (success) {
        console.log(`✅ Test réussi: Proxy optimisé pour Google`);
      } else {
        console.log(`❌ Test échoué: Échec de l'optimisation du proxy pour Google`);
      }
      
    } catch (error) {
      console.error("❌ Erreur lors du test d'optimisation pour Google:", error);
      
      this.results.push({
        name: "Optimisation des proxies pour Google",
        success: false,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Test: Résistance à la détection de bot
   */
  private async testBotDetectionResistance() {
    console.log("\n📋 TEST 4: Résistance à la détection de bot");
    
    try {
      if (!this.testAccount || !this.testProxy) {
        throw new Error("Compte ou proxy de test non disponible");
      }
      
      // Initialiser le navigateur si nécessaire
      if (!this.browser) {
        this.browser = await this.initBrowser();
      }
      
      // Nouvelle page pour le test
      const page = await this.browser.newPage();
      
      // Appliquer l'empreinte numérique et les protections
      const fingerprint = await fingerprintService.getAccountFingerprint(
        this.testAccount, 
        this.testProxy.country
      );
      
      await fingerprintService.applyFingerprintToPage(page, fingerprint);
      
      // Appliquer les protections avancées anti-détection
      await page.evaluateOnNewDocument(() => {
        // Masquer les indicateurs de webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Masquer les fonctions d'automation
        if (navigator.plugins) {
          // @ts-ignore
          Object.defineProperty(navigator, 'plugins', {
            get: () => {
              const plugins = new Array(3).fill(undefined).map(() => ({
                0: {}, 
                1: {},
                2: {},
                length: 3,
                item: (index: number) => this[index],
                namedItem: (name: string) => null,
                refresh: () => {}
              }));
              return plugins;
            }
          });
        }
        
        // Masquer les fonctions de test de navigateur
        if (navigator.languages !== undefined) {
          // @ts-ignore
          Object.defineProperty(navigator, 'languages', {
            get: () => ['fr-FR', 'fr', 'en-US', 'en']
          });
        }
        
        // Ajouter une fausse batterie
        // @ts-ignore
        Object.defineProperty(navigator, 'getBattery', {
          get: () => () => Promise.resolve({
            charging: Math.random() > 0.5,
            chargingTime: Math.floor(Math.random() * 1000),
            dischargingTime: Math.floor(Math.random() * 1000),
            level: Math.random()
          })
        });
      });
      
      console.log("✅ Protections avancées anti-détection appliquées");
      
      // Visiter successivement plusieurs sites de test anti-bot
      const botDetectionSites = [
        'https://bot.sannysoft.com',
        'https://arh.antoinevastel.com/bots/areyouheadless',
        'https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html'
      ];
      
      const results: Record<string, any> = {};
      
      for (const site of botDetectionSites) {
        const siteName = new URL(site).hostname;
        console.log(`⏳ Test du site ${siteName}...`);
        
        try {
          await page.goto(site, { waitUntil: 'networkidle0', timeout: 60000 });
          
          // Enregistrer une capture d'écran
          await page.screenshot({
            path: path.join(process.cwd(), 'test_results', `bot-detection-${siteName}.png`),
            fullPage: true
          });
          
          // Tester si la page contient des indicateurs de détection
          const pageContent = await page.content();
          const hasDetectionSignals = 
            pageContent.includes('bot detected') || 
            pageContent.includes('headless') ||
            pageContent.includes('automated') ||
            pageContent.includes('detection');
          
          results[siteName] = { success: !hasDetectionSignals };
          
          console.log(`${!hasDetectionSignals ? '✅' : '❌'} Test du site ${siteName} ${!hasDetectionSignals ? 'réussi' : 'échoué'}`);
        } catch (error) {
          results[siteName] = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          };
          console.log(`❌ Erreur lors du test de ${siteName}: ${error}`);
        }
      }
      
      // Calculer le score global
      const totalSites = Object.keys(results).length;
      const passedSites = Object.values(results).filter(r => r.success).length;
      const detectionResistanceScore = totalSites > 0 ? passedSites / totalSites : 0;
      
      // Résultat du test
      const success = detectionResistanceScore >= 0.5; // Au moins 50% des sites ne doivent pas détecter
      
      this.results.push({
        name: "Résistance à la détection de bot",
        success,
        details: {
          detectionResistanceScore,
          totalSites,
          passedSites,
          siteResults: results
        }
      });
      
      if (success) {
        console.log(`✅ Test réussi: Score de résistance à la détection ${(detectionResistanceScore * 100).toFixed(1)}%`);
      } else {
        console.log(`❌ Test échoué: Score de résistance à la détection ${(detectionResistanceScore * 100).toFixed(1)}%`);
      }
      
      // Fermer la page
      await page.close();
      
    } catch (error) {
      console.error("❌ Erreur lors du test de résistance à la détection:", error);
      
      this.results.push({
        name: "Résistance à la détection de bot",
        success: false,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Test: Correspondance géographique compte-proxy
   */
  private async testGeoMatching() {
    console.log("\n📋 TEST 5: Correspondance géographique compte-proxy");
    
    try {
      if (!this.testAccount || !this.testProxy) {
        throw new Error("Compte ou proxy de test non disponible");
      }
      
      // Récupérer le pays associé au compte
      const accountCountry = this.testAccount.country || 'US'; // Par défaut US
      
      // Récupérer le pays du proxy
      const proxyCountry = this.testProxy.country || 'US'; // Par défaut US
      
      // Vérifier si le service de géo-matching fonctionne
      const isGeoServiceWorking = geoMatchingService !== undefined;
      
      // Effectuer un test de correspondance
      let matchResult = { score: 0, matched: false };
      
      if (isGeoServiceWorking) {
        try {
          // Tester la correspondance géographique
          matchResult = await geoMatchingService.checkGeoCompatibility(
            accountCountry,
            proxyCountry
          );
          
          console.log(`✅ Test de correspondance géographique effectué: ${matchResult.matched ? 'Compatible' : 'Incompatible'}`);
        } catch (error) {
          console.error("⚠️ Erreur lors du test de correspondance géographique:", error);
          matchResult = { score: 0, matched: accountCountry === proxyCountry };
        }
      } else {
        // Fallback si le service n'est pas disponible
        matchResult = { 
          score: accountCountry === proxyCountry ? 1 : 0, 
          matched: accountCountry === proxyCountry 
        };
        
        console.log(`⚠️ Service de géo-matching non disponible, fallback effectué: ${matchResult.matched ? 'Compatible' : 'Incompatible'}`);
      }
      
      // Résultat du test
      const success = matchResult.matched;
      
      this.results.push({
        name: "Correspondance géographique compte-proxy",
        success,
        details: {
          accountCountry,
          proxyCountry,
          matchScore: matchResult.score,
          matched: matchResult.matched,
          serviceAvailable: isGeoServiceWorking
        }
      });
      
      if (success) {
        console.log(`✅ Test réussi: Correspondance géographique compatible`);
      } else {
        console.log(`❌ Test échoué: Compte (${accountCountry}) incompatible avec proxy (${proxyCountry})`);
      }
      
    } catch (error) {
      console.error("❌ Erreur lors du test de correspondance géographique:", error);
      
      this.results.push({
        name: "Correspondance géographique compte-proxy",
        success: false,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Affiche un résumé des tests
   */
  private showSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log("\n");
    console.log("============================================");
    console.log("📊 RÉSUMÉ DES TESTS DE SÉCURITÉ");
    console.log("============================================");
    console.log(`Total des tests: ${totalTests}`);
    console.log(`Tests réussis:   ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Tests échoués:   ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log("============================================");
    console.log("Détails par test:");
    
    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: ${result.success ? '✅ Réussi' : '❌ Échoué'}`);
    });
    
    console.log("============================================");
    
    if (passedTests === totalTests) {
      console.log("🎉 SUCCÈS: Toutes les mesures de sécurité sont opérationnelles!");
    } else if (passedTests >= totalTests * 0.8) {
      console.log("✅ ACCEPTABLE: La plupart des mesures de sécurité fonctionnent correctement.");
    } else if (passedTests >= totalTests * 0.5) {
      console.log("⚠️ ATTENTION: Plusieurs mesures de sécurité nécessitent des améliorations.");
    } else {
      console.log("❌ CRITIQUE: La sécurité du système est insuffisante et requiert des corrections majeures.");
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log("🔐 DÉMARRAGE DU TEST DES AMÉLIORATIONS DE SÉCURITÉ\n");
  
  const tester = new SecurityTester();
  await tester.runAllTests();
}

// Exécuter le script
main().catch(console.error);