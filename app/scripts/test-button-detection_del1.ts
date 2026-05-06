/**
 * Test spécifique pour la détection améliorée des boutons
 * 
 * Ce script teste uniquement la capacité à trouver et cliquer sur les boutons
 * sans exécuter le processus complet de publication d'avis.
 */

import { logger } from './server/services/logger.service';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';

async function testButtonDetection() {
  console.log("🚀 TEST DE DÉTECTION AMÉLIORÉE DES BOUTONS");
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    console.log("\n📱 Initialisation du navigateur...");
    
    // Configuration Puppeteer avec chemin spécifique vers Chromium pour Replit
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
      defaultViewport: {
        width: 1280,
        height: 800
      }
    });
    
    page = await browser.newPage();
    
    // Créer le répertoire temp s'il n'existe pas
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp');
    }
    
    // Configuration avancée de la page
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Activer les requêtes de type console.log
    page.on('console', msg => console.log(`PAGE CONSOLE: ${msg.text()}`));
    
    console.log("\n🔍 Accès à la page de connexion Google...");
    
    // URL de test
    await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Vérifier si la page est correctement chargée
    const title = await page.title();
    console.log(`\n📄 Titre de la page: ${title}`);
    
    // Capturer une capture d'écran
    await page.screenshot({ path: './temp/google-signin-initial.png' });
    
    console.log("\n🔎 Recherche du champ email...");
    
    // Liste de sélecteurs pour le champ email
    const emailSelectors = [
      'input[type="email"]',
      '#identifierId',
      'input[name="identifier"]',
      'input[aria-label*="mail"]',
      'input[aria-label*="phone"]'
    ];
    
    let emailFound = false;
    let emailSelector = '';
    
    // Tester chaque sélecteur
    for (const selector of emailSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          emailSelector = selector;
          emailFound = true;
          console.log(`\n✅ Champ email trouvé avec sélecteur: ${selector}`);
          break;
        }
      } catch (error) {
        // Continuer avec le prochain sélecteur
      }
    }
    
    // Si aucun des sélecteurs ne fonctionne, utiliser une approche JavaScript
    if (!emailFound) {
      console.log("\n🔄 Tentative de détection avancée du champ email...");
      
      const emailFieldFound = await page.evaluate(() => {
        // Fonction pour vérifier si un élément est visible
        function isVisible(element: Element): boolean {
          return !!(element.getBoundingClientRect().width || element.getBoundingClientRect().height);
        }
        
        // Stratégie 1: Par attribut type=email
        let inputs = Array.from(document.querySelectorAll('input[type="email"]'));
        for (const input of inputs) {
          if (isVisible(input)) {
            input.id = input.id || 'dynamic-email-field';
            return input.id;
          }
        }
        
        // Stratégie 2: Par champ visible contenant les termes 'email' ou 'identifier'
        inputs = Array.from(document.querySelectorAll('input'));
        for (const input of inputs) {
          if (isVisible(input)) {
            const attrs = [
              input.id,
              input.getAttribute('name'),
              input.getAttribute('placeholder'),
              input.getAttribute('aria-label')
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (attrs.includes('email') || attrs.includes('identifier')) {
              input.id = input.id || 'dynamic-email-field';
              return input.id;
            }
          }
        }
        
        // Stratégie 3: Premier champ input visible
        for (const input of inputs) {
          if (isVisible(input) && 
              input.getAttribute('type') !== 'hidden' && 
              input.getAttribute('type') !== 'submit') {
            input.id = input.id || 'first-visible-input';
            return input.id;
          }
        }
        
        return null;
      });
      
      if (emailFieldFound) {
        emailSelector = `#${emailFieldFound}`;
        emailFound = true;
        console.log(`\n✅ Champ email trouvé par JavaScript: ${emailSelector}`);
      } else {
        // Journaliser tous les champs input pour diagnostic
        const inputFields = await page.$$eval('input', (inputs) => {
          return inputs.map(input => ({
            id: input.id || '',
            type: input.getAttribute('type') || '',
            name: input.getAttribute('name') || '',
            placeholder: input.getAttribute('placeholder') || '',
            ariaLabel: input.getAttribute('aria-label') || '',
            classes: input.className
          }));
        });
        
        console.log("\n❌ Échec de détection du champ email. Champs disponibles:");
        console.log(JSON.stringify(inputFields, null, 2));
      }
    }
    
    if (!emailFound) {
      throw new Error("Impossible de trouver le champ email sur la page");
    }
    
    // Saisir l'email
    await page.type(emailSelector, 'test.account.reviewer@gmail.com', { delay: 100 });
    console.log("\n✍️ Email saisi");
    
    await page.screenshot({ path: './temp/google-signin-email-entered.png' });
    
    console.log("\n🔍 Recherche du bouton 'Suivant'...");
    
    // Liste de sélecteurs pour le bouton "Suivant"
    const nextButtonSelectors = [
      '#identifierNext',
      'button[jsname="LgbsSe"]',
      'button[jsname="V67aGc"]',
      'div[jsname="Njthtb"]',
      'button[name="next"]',
      'button[data-idom-class="nCP5yc AjY5Oe DuMIQc LQeN7 qIypjc TrZEUc lw1w4b"]',
      'button.VfPpkd-LgbsSe',
      'input[type="submit"]',
      'button:has-text("Suivant")',
      'button:has-text("Next")',
      'button.goog-inline-block'
    ];
    
    let buttonClicked = false;
    
    // Essayer chaque sélecteur
    for (const selector of nextButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          buttonClicked = true;
          console.log(`\n✅ Bouton cliqué avec sélecteur: ${selector}`);
          break;
        }
      } catch (error) {
        // Continuer avec le prochain sélecteur
      }
    }
    
    // Si aucun des sélecteurs n'a fonctionné, essayer notre nouvelle approche
    if (!buttonClicked) {
      console.log("\n🔄 Tentative de détection avancée du bouton...");
      
      // Utiliser notre approche améliorée
      const buttonFound = await page.evaluate(() => {
        // Fonction pour vérifier si un élément est visible
        function isVisible(el: Element): boolean {
          return !!(el.getBoundingClientRect().width || el.getBoundingClientRect().height);
        }
        
        // Termes de recherche plus complets
        const searchTerms = [
          'Next', 'Suivant', 'Sign in', 'Log in', 'Se connecter', 
          'Connexion', 'Submit', 'Continue', 'Login', 'Envoyer'
        ];
        
        // Recherche étendue de sélecteurs
        const buttons = Array.from(document.querySelectorAll(
          'button, input[type="submit"], div[role="button"], span[role="button"], a[role="button"]'
        )).filter(isVisible);
        
        // Essayer de trouver un bouton avec le texte correspondant
        for (const button of buttons) {
          const text = button.textContent || '';
          if (searchTerms.some(term => text.toLowerCase().includes(term.toLowerCase()))) {
            (button as HTMLElement).click();
            return { clicked: true, method: 'text_match', text };
          }
        }
        
        // Si aucun texte ne correspond, essayer le premier bouton visible dans le formulaire
        const forms = Array.from(document.querySelectorAll('form'));
        for (const form of forms) {
          const formButtons = Array.from(form.querySelectorAll(
            'button, input[type="submit"], div[role="button"]'
          )).filter(isVisible);
          
          if (formButtons.length > 0) {
            (formButtons[0] as HTMLElement).click();
            return { clicked: true, method: 'first_form_button' };
          }
        }
        
        // Dernier recours - cliquer sur n'importe quel bouton visible
        if (buttons.length > 0) {
          (buttons[0] as HTMLElement).click();
          return { clicked: true, method: 'any_visible_button' };
        }
        
        return { clicked: false };
      });
      
      buttonClicked = buttonFound.clicked;
      
      if (buttonClicked) {
        console.log(`\n✅ Bouton cliqué avec méthode: ${buttonFound.method}`);
      } else {
        // Dernier recours: appuyer sur Entrée
        await page.keyboard.press('Enter');
        console.log("\n🔄 Touche Entrée pressée");
        buttonClicked = true;
      }
    }
    
    if (!buttonClicked) {
      throw new Error("Impossible de cliquer sur le bouton 'Suivant'");
    }
    
    // Attendre que la page se charge après le clic
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Capturer une capture d'écran après le clic
    await page.screenshot({ path: './temp/google-signin-after-next.png' });
    
    // Vérifier si l'écran de mot de passe est affiché
    const passwordFieldVisible = await page.evaluate(() => {
      // Fonction pour vérifier si un élément est visible
      function isVisible(element: Element): boolean {
        return !!(element.getBoundingClientRect().width || element.getBoundingClientRect().height);
      }
      
      const passwordFields = Array.from(document.querySelectorAll('input[type="password"]'));
      return passwordFields.some(isVisible);
    });
    
    if (passwordFieldVisible) {
      console.log("\n✅ SUCCÈS: Écran de mot de passe affiché, la détection du bouton a fonctionné!");
    } else {
      console.log("\n⚠️ Écran de mot de passe non détecté. Vérification du contenu de la page...");
      
      // Capturer le contenu HTML pour diagnostic
      const pageContent = await page.content();
      fs.writeFileSync('./temp/google-signin-debug.html', pageContent);
      
      // Vérifier s'il y a des messages d'erreur
      const errorMessage = await page.evaluate(() => {
        const errorSelectors = [
          '[aria-live="polite"]', 
          '.o6cuMc', 
          '.OyEIQ',
          '[jsname="B34EJ"]', 
          '.EjBTad'
        ];
        
        for (const selector of errorSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            return element.textContent;
          }
        }
        return null;
      });
      
      if (errorMessage) {
        console.log(`\n❌ Erreur détectée: ${errorMessage}`);
      } else {
        console.log("\n❓ Aucune erreur spécifique détectée. Voir les captures d'écran pour plus d'informations.");
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) {
      await page.screenshot({ path: './temp/google-signin-final.png' });
    }
    
    if (browser) {
      await browser.close();
    }
    
    console.log("\n✅ Test terminé");
  }
}

testButtonDetection()
  .catch(err => {
    console.error(`\n❌ Erreur critique: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });