/**
 * Script de test pour les services de heat maps d'interaction
 * 
 * Ce script permet de:
 * 1. Créer des heat maps simulées pour tester le système
 * 2. Vérifier que les services fonctionnent correctement
 * 3. Visualiser les résultats dans la console
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { interactionCollector } from './server/services/interaction-collector.service';
import { interactionHeatmap } from './server/services/interaction-heatmap.service';
import { advancedBehavior } from './server/services/advanced-behavioral-simulation.service';
import { logger } from './server/services/logger.service';

// Constantes
const TEST_ACCOUNT_ID = 9999; // ID fictif pour les tests
const TEST_PLATFORM = 'google';
const TEST_PAGE_TYPE = 'review_form';
const TEST_PAGE_URL = 'https://www.google.com/maps/reviews';

/**
 * Génère des données d'interaction simulées
 */
async function generateMockInteractions() {
  console.log('Génération de données d\'interaction simulées...');
  
  // Tailles d'écran fictives
  const viewportWidth = 1280;
  const viewportHeight = 800;
  
  // Types d'interactions à simuler
  const interactionTypes = ['click', 'hover', 'scroll', 'move', 'type'];
  
  // Points d'intérêt simulés (formulaire d'avis Google Maps)
  const interestPoints = [
    { x: 400, y: 150, type: 'click', elementSelector: '.header-title', desc: 'Titre du formulaire' },
    { x: 300, y: 250, type: 'click', elementSelector: '.star-rating', desc: 'Étoiles de notation' },
    { x: 400, y: 350, type: 'click', elementSelector: 'textarea.review-text', desc: 'Champ de texte' },
    { x: 400, y: 350, type: 'type', elementSelector: 'textarea.review-text', desc: 'Saisie du texte' },
    { x: 500, y: 450, type: 'click', elementSelector: 'button.submit', desc: 'Bouton soumettre' },
    { x: 200, y: 200, type: 'scroll', desc: 'Défilement 1' },
    { x: 200, y: 400, type: 'scroll', desc: 'Défilement 2' }
  ];
  
  // Nombre de points à générer autour de chaque point d'intérêt
  const pointsPerInterest = 30;
  
  // Pour chaque point d'intérêt
  for (const point of interestPoints) {
    for (let i = 0; i < pointsPerInterest; i++) {
      // Ajouter une variation aléatoire à la position
      const variationX = Math.floor((Math.random() - 0.5) * 40);
      const variationY = Math.floor((Math.random() - 0.5) * 40);
      
      // Créer un point d'interaction
      const interactionPoint = {
        x: point.x + variationX,
        y: point.y + variationY,
        type: point.type || interactionTypes[Math.floor(Math.random() * interactionTypes.length)],
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)), // Dernière heure
        elementSelector: point.elementSelector,
        elementText: point.desc,
        viewportWidth,
        viewportHeight
      };
      
      // Enregistrer le point d'interaction
      interactionHeatmap.recordInteraction(
        TEST_PLATFORM,
        TEST_PAGE_URL,
        TEST_PAGE_TYPE,
        interactionPoint as any
      );
    }
  }
  
  console.log(`${pointsPerInterest * interestPoints.length} points d'interaction générés.`);
}

/**
 * Fonction principale
 */
async function main() {
  console.log('Lancement du test des heat maps d\'interaction...');
  
  // Créer le répertoire de données si nécessaire
  const dataDir = './data/heatmaps';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Générer des données simulées
  await generateMockInteractions();
  
  // Récupérer la heat map générée
  const heatMap = interactionHeatmap.getHeatMap(TEST_PLATFORM, TEST_PAGE_URL);
  
  if (heatMap) {
    console.log('Heat map générée avec succès !');
    console.log(`ID: ${heatMap.id}`);
    console.log(`Points d'interaction: ${heatMap.interactionPoints.length}`);
    console.log(`Cellules de clic: ${heatMap.aggregatedData.clickHeatMap.length}`);
    console.log(`Cellules de survol: ${heatMap.aggregatedData.hoverHeatMap.length}`);
    console.log(`Cellules de défilement: ${heatMap.aggregatedData.scrollHeatMap.length}`);
    console.log(`Étapes de flux: ${heatMap.aggregatedData.interactionFlow.length}`);
    
    // Utiliser la heat map pour générer un pattern d'interaction
    console.log('\nGénération d\'un pattern d\'interaction...');
    const pattern = interactionHeatmap.generateInteractionPattern(
      TEST_PLATFORM,
      TEST_PAGE_URL,
      TEST_PAGE_TYPE,
      1280,
      800
    );
    
    console.log(`Pattern généré avec ${pattern.length} étapes.`);
    
    if (pattern.length > 0) {
      console.log('\nPremières étapes du pattern:');
      for (let i = 0; i < Math.min(3, pattern.length); i++) {
        const step = pattern[i];
        console.log(`${i+1}. Type: ${step.type}, Probabilité: ${step.probability.toFixed(2)}, Durée: ${step.averageDuration}ms`);
        console.log(`   Zone: (${step.targetArea.x1},${step.targetArea.y1}) - (${step.targetArea.x2},${step.targetArea.y2})`);
        if (step.elementSelector) {
          console.log(`   Sélecteur: ${step.elementSelector}`);
        }
      }
    }
    
    // Tester avec Puppeteer si demandé
    const testWithPuppeteer = process.argv.includes('--with-browser');
    
    if (testWithPuppeteer) {
      console.log('\nTest de simulation avec Puppeteer...');
      
      // Lancer un navigateur
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 800 }
      });
      
      try {
        // Ouvrir une page
        const page = await browser.newPage();
        await page.goto('https://www.google.com');
        
        console.log('Navigation vers Google...');
        
        // Démarrer une session de collecte
        await interactionCollector.startSession(
          page,
          TEST_ACCOUNT_ID,
          TEST_PLATFORM,
          TEST_PAGE_TYPE
        );
        
        console.log('Session de collecte démarrée.');
        
        // Simuler une navigation non-linéaire
        console.log('Simulation d\'une navigation non-linéaire...');
        await advancedBehavior.simulateNonLinearNavigation(
          page,
          TEST_ACCOUNT_ID,
          20000, // 20 secondes
          TEST_PLATFORM,
          TEST_PAGE_TYPE
        );
        
        console.log('Navigation simulée terminée.');
        
        // Terminer la session
        interactionCollector.endSession(page);
        
        console.log('Session de collecte terminée.');
        
        // Attendre un peu avant de fermer
        await new Promise(resolve => setTimeout(resolve, 5000));
      } finally {
        // Fermer le navigateur
        await browser.close();
      }
    }
    
  } else {
    console.error('Erreur: Heat map non générée.');
  }
  
  console.log('\nTest terminé.');
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur:', error);
  process.exit(1);
});