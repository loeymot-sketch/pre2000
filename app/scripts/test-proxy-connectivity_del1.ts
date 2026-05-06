/**
 * Script pour tester la connectivité des proxies avant la génération de comptes
 * 
 * Ce script vérifie si les proxies nécessaires sont disponibles et fonctionnels
 * en tentant de se connecter à chaque plateforme via les proxies.
 */

import { db } from './server/db';
import { proxies } from './shared/schema';
import { eq } from 'drizzle-orm';
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
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Assurez-vous que puppeteer utilisera le plugin stealth
puppeteer.use(StealthPlugin());

// Types
type ProxyTestResult = {
  platform: string;
  proxyId: number;
  host: string;
  port: number;
  success: boolean;
  error?: string;
  responseTime: number;
  status?: number;
  testUrl: string;
  timestamp: Date;
};

// Configuration
const TEST_URLS = {
  google: 'https://www.google.com',
  trustpilot: 'https://www.trustpilot.com',
  tripadvisor: 'https://www.tripadvisor.com'
};

// Classe de test des proxies
class ProxyConnectivityTester {
  private writeFileAsync = promisify(fs.writeFile);
  private mkdirAsync = promisify(fs.mkdir);
  private results: ProxyTestResult[] = [];
  private tempDir = './temp/proxy-tests';
  
  constructor() {}
  
  /**
   * Crée le répertoire temporaire si nécessaire
   */
  private async createTempDir() {
    try {
      await this.mkdirAsync(this.tempDir, { recursive: true });
      console.log(`📁 Répertoire ${this.tempDir} créé ou déjà existant.`);
    } catch (error) {
      console.error(`❌ Erreur lors de la création du répertoire ${this.tempDir}:`, error);
    }
  }
  
  /**
   * Récupère les proxies depuis la base de données
   */
  private async getProxies(platform?: string) {
    try {
      let query = db.select().from(proxies).where(eq(proxies.status, 'active'));
      if (platform) {
        // Si on a une requête pour une plateforme spécifique, on pourrait filtrer davantage
        // Mais pour l'instant on retourne tous les proxies actifs
      }
      return await query;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des proxies:', error);
      return [];
    }
  }
  
  /**
   * Teste un proxy spécifique pour une plateforme donnée
   */
  private async testProxy(proxy: any, platform: string): Promise<ProxyTestResult> {
    console.log(`🔍 Test du proxy ${proxy.host}:${proxy.port} pour ${platform}...`);
    
    const startTime = Date.now();
    let success = false;
    let error = '';
    let responseStatus;
    
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
    
    try {
      // Lancement du navigateur
      browser = await puppeteer.launch(browserOptions);
      
      // Création d'une page
      const page = await browser.newPage();
      
      // Configuration des identifiants du proxy si nécessaire
      if (proxy.username && proxy.password) {
        await page.authenticate({
          username: proxy.username,
          password: proxy.password
        });
      }
      
      // Configuration du User-Agent
      const userAgent = generateRandomUserAgent();
      await page.setUserAgent(userAgent);
      
      // Définir un viewport réaliste
      await page.setViewport({ width: 1366, height: 768 });
      
      // Naviguer vers l'URL de test
      const testUrl = TEST_URLS[platform as keyof typeof TEST_URLS];
      
      const response = await page.goto(testUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      responseStatus = response?.status();
      
      // Vérifier si la connexion a réussi
      if (responseStatus && responseStatus >= 200 && responseStatus < 400) {
        success = true;
        console.log(`✅ Connexion réussie à ${platform} via le proxy ${proxy.host}:${proxy.port}`);
        
        // Prendre une capture d'écran pour vérification
        const screenshotPath = path.join(this.tempDir, `${platform}-proxy-${proxy.id}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Capture d'écran sauvegardée: ${screenshotPath}`);
      } else {
        error = `Code de statut HTTP: ${responseStatus}`;
        console.error(`❌ Échec de connexion à ${platform} via le proxy ${proxy.host}:${proxy.port}: ${error}`);
      }
      
    } catch (err: any) {
      error = err.message || 'Erreur inconnue';
      console.error(`❌ Erreur lors du test du proxy ${proxy.host}:${proxy.port}: ${error}`);
    } finally {
      // Fermer le navigateur
      if (browser) {
        await browser.close();
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      platform,
      proxyId: proxy.id,
      host: proxy.host,
      port: proxy.port,
      success,
      error: success ? undefined : error,
      responseTime,
      status: responseStatus,
      testUrl: TEST_URLS[platform as keyof typeof TEST_URLS],
      timestamp: new Date()
    };
  }
  
  /**
   * Teste tous les proxies disponibles pour toutes les plateformes
   */
  private async testAllProxies() {
    const platforms = Object.keys(TEST_URLS);
    
    // Récupérer tous les proxies disponibles
    console.log(`🔍 Récupération des proxies depuis la base de données...`);
    const allProxies = await this.getProxies();
    
    if (!allProxies || allProxies.length === 0) {
      console.warn(`⚠️ Aucun proxy trouvé dans la base de données`);
      return;
    }
    
    console.log(`📊 ${allProxies.length} proxies trouvés au total`);
    
    for (const platform of platforms) {
      console.log(`\n===== TEST DES PROXIES POUR ${platform.toUpperCase()} =====\n`);
      
      // On utilise tous les proxies disponibles pour chaque plateforme
      for (const proxy of allProxies) {
        const result = await this.testProxy(proxy, platform);
        this.results.push(result);
        
        // Petite pause entre les tests pour éviter de surcharger
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  /**
   * Génère et enregistre un rapport des tests
   */
  private async generateReport() {
    if (this.results.length === 0) {
      console.warn(`⚠️ Aucun résultat de test à rapporter`);
      return;
    }
    
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;
    const successRate = Math.round((successCount / this.results.length) * 100);
    
    let report = '\n\n=========== RAPPORT DE TEST DES PROXIES ===========\n\n';
    report += `Date: ${new Date().toISOString()}\n`;
    report += `Total de tests: ${this.results.length}\n`;
    report += `Tests réussis: ${successCount} (${successRate}%)\n`;
    report += `Tests échoués: ${failureCount}\n\n`;
    
    // Statistiques par plateforme
    const platforms = Object.keys(TEST_URLS);
    for (const platform of platforms) {
      const platformResults = this.results.filter(r => r.platform === platform);
      const platformSuccessCount = platformResults.filter(r => r.success).length;
      const platformSuccessRate = platformResults.length > 0 
        ? Math.round((platformSuccessCount / platformResults.length) * 100) 
        : 0;
      
      report += `=== ${platform.toUpperCase()} ===\n`;
      report += `Tests: ${platformResults.length}\n`;
      report += `Réussis: ${platformSuccessCount} (${platformSuccessRate}%)\n`;
      report += `Temps moyen de réponse: ${Math.round(
        platformResults.reduce((sum, r) => sum + r.responseTime, 0) / (platformResults.length || 1)
      )} ms\n\n`;
    }
    
    // Détails des tests échoués
    if (failureCount > 0) {
      report += '=== DÉTAILS DES ÉCHECS ===\n';
      this.results.filter(r => !r.success).forEach((result, index) => {
        report += `\n[${index + 1}] Plateforme: ${result.platform}\n`;
        report += `    Proxy: ${result.host}:${result.port} (ID: ${result.proxyId})\n`;
        report += `    Erreur: ${result.error}\n`;
        report += `    URL testée: ${result.testUrl}\n`;
        report += `    Timestamp: ${result.timestamp.toISOString()}\n`;
      });
    }
    
    report += '\n=====================================================\n';
    
    console.log(report);
    
    // Sauvegarder le rapport dans un fichier
    const reportPath = path.join(this.tempDir, `proxy-report-${Date.now()}.txt`);
    await this.writeFileAsync(reportPath, report);
    console.log(`📄 Rapport sauvegardé dans ${reportPath}`);
    
    // Sauvegarder les données brutes en JSON
    const jsonPath = path.join(this.tempDir, `proxy-report-${Date.now()}.json`);
    await this.writeFileAsync(jsonPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Données brutes sauvegardées dans ${jsonPath}`);
  }
  
  /**
   * Exécute tous les tests et génère un rapport
   */
  public async run() {
    try {
      console.log('🚀 Démarrage du test de connectivité des proxies');
      
      await this.createTempDir();
      await this.testAllProxies();
      await this.generateReport();
      
      console.log('✅ Tests de connectivité des proxies terminés');
      
      // Retourner un résumé des résultats
      return {
        total: this.results.length,
        success: this.results.filter(r => r.success).length,
        failure: this.results.filter(r => !r.success).length,
        details: this.results
      };
    } catch (error) {
      console.error('❌ Erreur fatale lors des tests de connectivité:', error);
      throw error;
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    const tester = new ProxyConnectivityTester();
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