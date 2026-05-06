/**
 * Script simplifié de test pour les services de heat maps d'interaction
 */

import fs from 'fs';
import path from 'path';
import { interactionHeatmap } from './server/services/interaction-heatmap.service';

const TEST_PLATFORM = 'google';
const TEST_PAGE_TYPE = 'review_form';
const TEST_PAGE_URL = 'https://www.google.com/maps/reviews';

/**
 * Génère une heat map simple pour tester
 */
function generateSimpleHeatMap() {
  console.log('Génération d\'une heat map simple...');
  
  // Tailles d'écran
  const viewportWidth = 1280;
  const viewportHeight = 800;
  
  // Créer quelques points d'interaction
  const points = [
    { x: 400, y: 150, type: 'click', elementSelector: '.header-title' },
    { x: 300, y: 250, type: 'click', elementSelector: '.star-rating' },
    { x: 400, y: 350, type: 'type', elementSelector: 'textarea.review-text' },
    { x: 500, y: 450, type: 'click', elementSelector: 'button.submit' }
  ];
  
  // Enregistrer les points
  points.forEach(point => {
    interactionHeatmap.recordInteraction(
      TEST_PLATFORM,
      TEST_PAGE_URL,
      TEST_PAGE_TYPE,
      {
        x: point.x,
        y: point.y,
        type: point.type as any,
        timestamp: new Date(),
        elementSelector: point.elementSelector,
        viewportWidth,
        viewportHeight
      }
    );
  });
  
  console.log(`${points.length} points d'interaction enregistrés.`);
  
  // Vérifier la heat map
  const heatMap = interactionHeatmap.getHeatMap(TEST_PLATFORM, TEST_PAGE_URL);
  
  if (heatMap) {
    console.log('Heat map créée avec succès !');
    console.log(`ID: ${heatMap.id}`);
    console.log(`Points d'interaction: ${heatMap.interactionPoints.length}`);
    
    // Générer un pattern d'interaction
    console.log('\nGénération d\'un pattern d\'interaction...');
    const pattern = interactionHeatmap.generateInteractionPattern(
      TEST_PLATFORM,
      TEST_PAGE_URL,
      TEST_PAGE_TYPE,
      viewportWidth,
      viewportHeight
    );
    
    console.log(`Pattern généré avec ${pattern.length} étapes.`);
  } else {
    console.error('Erreur: Heat map non créée.');
  }
}

/**
 * Fonction principale
 */
function main() {
  console.log('Test simplifié des heat maps d\'interaction...');
  
  // Créer le répertoire de données si nécessaire
  const dataDir = './data/heatmaps';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Générer une heat map
  generateSimpleHeatMap();
  
  console.log('\nTest terminé.');
}

// Exécuter le script
main();