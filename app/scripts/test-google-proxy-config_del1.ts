/**
 * Script de test pour la nouvelle configuration des proxies optimisée pour Google
 * 
 * Ce script teste la nouvelle intégration du service proxy-config avec l'automation service
 * pour vérifier que les configurations spécifiques à Google sont correctement appliquées.
 */

import { storage } from './server/storage';
import { proxyConfigService } from './server/services/proxy-config.service';
import { ProxyType as Proxy } from '@shared/schema';
import { logger } from './server/services/logger.service';
import { proxyService } from './server/services/proxy.service';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import { promisify } from 'util';
import { Browser } from 'puppeteer';

// Configuration de puppeteer avec le plugin stealth pour éviter la détection
puppeteer.use(StealthPlugin());

// Promisifier les opérations de fichier
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Teste la génération d'URLs de proxy optimisées
 * @param proxies Liste des proxies à tester
 */
async function testProxyUrlGeneration(proxies: Proxy[]): Promise<void> {
  console.log("\n=== Test de génération d'URLs de proxy optimisées ===");
  
  const results: { 
    proxyId: number;
    platform: string;
    originalUrl: string;
    optimizedUrl: string;
    hasGoogleOptions: boolean;
  }[] = [];
  
  // Tester chaque proxy avec différentes plateformes
  for (const proxy of proxies) {
    const platforms = ["google", "trustpilot", "tripadvisor"];
    const originalUrl = `${proxy.host}:${proxy.port}`;
    
    for (const platform of platforms) {
      const optimizedUrl = proxyConfigService.getOptimizedProxyUrl(proxy, platform);
      const hasGoogleOptions = platform === "google" && 
                              optimizedUrl.includes("google_") || 
                              optimizedUrl.includes("session=");
      
      results.push({
        proxyId: proxy.id,
        platform,
        originalUrl,
        optimizedUrl,
        hasGoogleOptions
      });
      
      console.log(`Proxy #${proxy.id} - ${platform}:`);
      console.log(`  Original: ${originalUrl}`);
      console.log(`  Optimisé: ${optimizedUrl}`);
      console.log(`  Options Google: ${hasGoogleOptions ? "OUI" : "NON"}`);
    }
  }
  
  // Enregistrer les résultats dans un fichier
  await writeResultsToFile("proxy_url_generation", results);
  
  console.log(`\nRésultats enregistrés dans ./test_reports/proxy_url_generation.json`);
}

/**
 * Teste l'initialisation du navigateur avec des arguments optimisés
 * @param proxy Proxy à tester
 */
async function testBrowserInitialization(proxy: Proxy): Promise<void> {
  console.log("\n=== Test d'initialisation du navigateur avec des arguments optimisés ===");
  
  const platforms = ["google", "trustpilot"];
  let browser: Browser | null = null;
  
  for (const platform of platforms) {
    try {
      console.log(`\nDémarrage du navigateur avec configuration pour ${platform}...`);
      
      // Arguments de base
      const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--headless',
        '--disable-gpu'
      ];
      
      // Obtenir les arguments optimisés via le service
      const optimizedArgs = proxyConfigService.configureBrowserArgs(proxy, baseArgs, platform);
      
      console.log(`Arguments configurés (${optimizedArgs.length} au total):`);
      optimizedArgs.forEach(arg => {
        if (arg.includes('proxy') || arg.includes('disable-web-security') || arg.includes('blink-features')) {
          console.log(`  ${arg}`);
        }
      });
      
      // Initialiser le navigateur avec les arguments optimisés
      console.log("Lancement du navigateur...");
      browser = await puppeteer.launch({
        headless: true,
        args: optimizedArgs
      });
      
      // Vérifier que le navigateur est correctement initialisé
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(30000);
      
      // Accéder à une page simple pour vérifier que le navigateur fonctionne
      console.log("Accès à example.com...");
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      const title = await page.title();
      
      console.log(`Titre de la page: ${title}`);
      console.log(`Test pour ${platform}: ${title ? "Succès" : "Échec"}`);
      
      // Capturer un screenshot
      const screenshotPath = `./test_reports/${platform}_browser_test.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot enregistré: ${screenshotPath}`);
      
      // Fermer le navigateur
      await browser.close();
      browser = null;
      
    } catch (error) {
      console.error(`Erreur lors de l'initialisation du navigateur pour ${platform}:`);
      console.error(error);
      
      // Assurer que le navigateur est fermé en cas d'erreur
      if (browser) {
        await browser.close();
        browser = null;
      }
    }
  }
}

/**
 * Enregistre les résultats des tests dans un fichier JSON
 */
async function writeResultsToFile(testName: string, data: any): Promise<void> {
  try {
    // Créer le répertoire si nécessaire
    await mkdirAsync('./test_reports', { recursive: true });
    
    // Enregistrer les données dans un fichier JSON
    await writeFileAsync(
      `./test_reports/${testName}.json`,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des résultats:", error);
  }
}

/**
 * Fonction principale qui exécute tous les tests
 */
async function main() {
  try {
    console.log("=== DÉBUT DES TESTS DE CONFIGURATION DES PROXIES POUR GOOGLE ===");
    
    // 1. Obtenir les proxies de test depuis la base de données
    console.log("Récupération des proxies depuis la base de données...");
    const proxies = await storage.getProxies();
    
    if (!proxies || proxies.length === 0) {
      throw new Error("Aucun proxy trouvé dans la base de données!");
    }
    
    console.log(`${proxies.length} proxies trouvés.`);
    
    // 2. Filtrer les proxies optimisés pour Google
    const googleProxies = proxies.filter(p => 
      p.options && 
      (
        (p.options as any).google_kyc || 
        (p.options as any).google_optimize || 
        (p.options as any).google_access
      )
    );
    
    console.log(`${googleProxies.length} proxies optimisés pour Google trouvés.`);
    
    if (googleProxies.length === 0) {
      console.log("Aucun proxy optimisé pour Google trouvé. Utilisation des proxies standards.");
    }
    
    // 3. Sélectionner quelques proxies pour les tests (max 3)
    const testProxies = googleProxies.length > 0 ? 
      googleProxies.slice(0, Math.min(googleProxies.length, 3)) : 
      proxies.slice(0, Math.min(proxies.length, 3));
    
    // 4. Tester la génération d'URLs de proxy optimisées
    await testProxyUrlGeneration(testProxies);
    
    // 5. Tester l'initialisation du navigateur
    if (testProxies.length > 0) {
      await testBrowserInitialization(testProxies[0]);
    }
    
    console.log("\n=== TESTS TERMINÉS ===");
    
  } catch (error) {
    console.error("Erreur lors des tests:", error);
  }
}

// Exécuter la fonction principale
main()
  .then(() => {
    console.log("Scripts de test terminés.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erreur non gérée:", error);
    process.exit(1);
  });