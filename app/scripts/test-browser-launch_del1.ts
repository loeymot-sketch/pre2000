/**
 * Script de test pour vérifier le lancement du navigateur dans l'environnement Replit
 * 
 * Ce script teste si les modifications apportées à la méthode initializeBrowser
 * permettent de contourner les restrictions de sandbox dans l'environnement Replit.
 */

import puppeteer, { Browser } from 'puppeteer';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const PROXY_HOST = 'brd.superproxy.io';
const PROXY_PORT = '22225';
const PROXY_USERNAME = process.env.BRIGHT_DATA_USERNAME || '';
const PROXY_PASSWORD = process.env.BRIGHT_DATA_PASSWORD || '';

async function findChromiumPath(): Promise<string> {
  try {
    // Vérifier si une variable d'environnement existe pour le chemin de Chrome
    if (process.env.CHROME_PATH) {
      console.log(`Utilisation de CHROME_PATH: ${process.env.CHROME_PATH}`);
      return process.env.CHROME_PATH;
    }
    
    // Chemins potentiels à vérifier
    const possiblePaths = [
      '/nix/store/*/bin/chromium',         // Chemin typique dans Replit/Nix
      '/nix/store/*/bin/chromium-browser', // Alternative
      '/usr/bin/chromium',                 // Linux standard
      '/usr/bin/chromium-browser',         // Alternative Linux
      '/usr/bin/google-chrome',            // Chrome (alternative)
      '/usr/bin/google-chrome-stable',     // Chrome stable (alternative)
    ];
    
    for (const pathPattern of possiblePaths) {
      try {
        const { stdout } = await execAsync(`ls ${pathPattern} 2>/dev/null || echo ''`);
        const foundPaths = stdout.trim().split('\n');
        
        // Retourne le premier chemin trouvé qui n'est pas vide
        const validPath = foundPaths.find((p: string) => p && p.length > 0);
        if (validPath) {
          console.log(`Chrome trouvé avec recherche manuelle: ${validPath}`);
          return validPath;
        }
      } catch (error) {
        // Continuer avec le prochain chemin
        console.log(`Chemin non trouvé: ${pathPattern}`);
      }
    }
  } catch (error) {
    console.log(`Erreur lors de la recherche manuelle: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
  }
  
  // Si aucun chemin n'est trouvé, utiliser puppeteer par défaut sans chemin spécifique
  console.log('Aucun exécutable Chromium/Chrome trouvé, utilisation du navigateur par défaut de puppeteer');
  return '';
}

async function initializeBrowser(): Promise<Browser> {
  // Générer un profil temporaire aléatoire
  const tempUserDataDir = `${process.cwd()}/temp/user_data_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Paramètres aléatoires pour éviter l'empreinte digitale du navigateur
  const screenHeight = [768, 900, 1080, 1440][Math.floor(Math.random() * 4)];
  const screenWidth = screenHeight === 768 ? 1366 : 
                     screenHeight === 900 ? 1440 : 
                     screenHeight === 1080 ? 1920 : 2560;
  
  // Recherche de l'exécutable Chromium ou Chrome
  const chromiumExecutablePath = await findChromiumPath();
  console.log(`Utilisation de l'exécutable navigateur: ${chromiumExecutablePath || 'par défaut'}`);
  
  console.log("Lancement du navigateur avec options spéciales pour l'environnement Replit...");
  
  // Configuration spéciale pour l'environnement Replit
  // Les arguments spécifiques pour contourner les restrictions de sandbox
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: tempUserDataDir,
    executablePath: chromiumExecutablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--proxy-server=${PROXY_HOST}:${PROXY_PORT}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${screenWidth},${screenHeight}`,
      '--lang=fr-FR,fr',
      // Options supplémentaires pour l'anti-détection
      '--disable-infobars',
      '--disable-extensions',
      '--no-default-browser-check',
      '--disable-sync',
      '--no-pings',
      '--disable-webgl',
      '--disable-threaded-animation',
      '--disable-threaded-scrolling',
      '--disable-in-process-stack-traces',
      '--disable-histogram-customizer',
      '--disable-breakpad',
      '--disable-features=site-per-process,IsolateOrigins,site-per-process',
      '--disable-hang-monitor',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--no-zygote',
      '--no-first-run'
    ]
  });
  
  return browser;
}

async function testBrowserLaunch() {
  console.log("Démarrage du test de lancement du navigateur...");
  let browser: Browser | null = null;
  
  try {
    // Initialiser le navigateur
    browser = await initializeBrowser();
    console.log("✅ Navigateur lancé avec succès!");

    // Créer une nouvelle page
    const page = await browser.newPage();
    console.log("✅ Nouvelle page créée avec succès!");
    
    // Configurer l'authentification du proxy
    if (PROXY_USERNAME && PROXY_PASSWORD) {
      await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD
      });
      console.log("✅ Authentification du proxy configurée!");
    } else {
      console.warn("⚠️ Identifiants proxy non configurés. Cela peut causer des problèmes de connexion.");
    }
    
    // Tester la navigation vers une page simple
    console.log("Navigation vers example.com...");
    await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log("✅ Navigation réussie!");
    
    // Capturer le contenu de la page
    const pageTitle = await page.title();
    const pageContent = await page.content();
    console.log(`Titre de la page: ${pageTitle}`);
    console.log(`Longueur du contenu: ${pageContent.length} caractères`);

    // Si on arrive ici, c'est que le test a réussi
    console.log("\n🎉 TEST RÉUSSI: Le navigateur fonctionne correctement dans l'environnement Replit!");
    
    return true;
  } catch (error) {
    console.error("❌ TEST ÉCHOUÉ: Erreur lors du lancement du navigateur:");
    console.error(error);
    return false;
  } finally {
    if (browser) {
      console.log("Fermeture du navigateur...");
      await browser.close();
      console.log("Navigateur fermé.");
    }
  }
}

// Exécuter le test
testBrowserLaunch()
  .then(success => {
    console.log(`Test terminé avec ${success ? "succès" : "échec"}.`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Erreur non gérée:", error);
    process.exit(1);
  });