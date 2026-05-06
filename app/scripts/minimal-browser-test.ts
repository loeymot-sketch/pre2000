/**
 * Test minimal de lancement de navigateur dans Replit
 * 
 * Ce script utilise une configuration minimale pour tester
 * si Puppeteer peut fonctionner dans l'environnement Replit.
 */

import puppeteer from 'puppeteer';

async function minimalTest() {
  console.log("Démarrage du test minimal de Puppeteer...");
  
  try {
    console.log("Tentative de lancement du navigateur sans utiliser de proxy...");
    
    // Chemin vers l'exécutable Chromium installé
    const chromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
    console.log(`Utilisation de l'exécutable Chromium: ${chromiumPath}`);
    
    // Configuration extrêmement minimale
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
        '--single-process', // Crucial pour les environnements à ressources limitées
        '--no-zygote',      // Évite de créer des processus enfants
        '--mute-audio'      // Pas besoin d'audio
      ]
    });
    
    console.log("✅ Navigateur lancé avec succès!");
    
    // Créer une page
    const page = await browser.newPage();
    console.log("✅ Page créée avec succès!");
    
    // Visiter une page simple
    await page.goto('https://example.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 // Timeout court pour éviter de bloquer
    });
    
    // Vérifier que la page a chargé
    const title = await page.title();
    console.log(`✅ Page chargée avec succès! Titre: ${title}`);
    
    // Fermer le navigateur
    await browser.close();
    console.log("✅ Navigateur fermé proprement");
    
    return true;
  } catch (error) {
    console.error("❌ Erreur:", error);
    return false;
  }
}

// Exécuter le test avec timeout de sécurité
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Test timeout après 20 secondes")), 20000);
});

Promise.race([minimalTest(), timeoutPromise])
  .then(result => {
    console.log(`Test terminé avec ${result === true ? "succès" : "échec"}.`);
    process.exit(result === true ? 0 : 1);
  })
  .catch(error => {
    console.error("Test échoué:", error.message);
    process.exit(1);
  });