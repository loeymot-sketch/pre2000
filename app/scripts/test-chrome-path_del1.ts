/**
 * Test de lancement d'un navigateur avec le chemin spécifique vers Chromium
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Configurer puppeteer-extra avec le plugin stealth
puppeteer.use(StealthPlugin());

async function testChromiumLaunch() {
  console.log('Démarrage du test de lancement de Chromium...');
  
  // Chemin trouvé par la commande which
  const chromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  console.log(`Utilisation du chemin Chromium: ${chromiumPath}`);
  
  try {
    // Lancer le navigateur avec le chemin explicite
    console.log('Lancement du navigateur...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-web-security',
        '--single-process',
        '--no-zygote',
        '--mute-audio'
      ]
    });
    
    console.log('✅ Navigateur lancé avec succès!');
    
    // Créer une page
    console.log('Création d\'une page...');
    const page = await browser.newPage();
    console.log('✅ Page créée avec succès!');
    
    // Visiter une page simple
    console.log('Navigation vers example.com...');
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Vérifier que la page a chargé
    const title = await page.title();
    console.log(`✅ Page chargée avec succès! Titre: ${title}`);
    
    // Prendre une capture d'écran
    console.log('Prise d\'une capture d\'écran...');
    await page.screenshot({ path: 'example-screenshot.png' });
    console.log('✅ Capture d\'écran sauvegardée dans example-screenshot.png');
    
    // Fermer le navigateur
    console.log('Fermeture du navigateur...');
    await browser.close();
    console.log('✅ Navigateur fermé avec succès!');
    
    console.log('Test terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testChromiumLaunch()
  .then(() => console.log('Script terminé.'))
  .catch(console.error);