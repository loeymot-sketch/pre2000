/**
 * Script de test avec sauvegarde forcée
 */

import fs from 'fs';
import path from 'path';
import { interactionHeatmap } from './server/services/interaction-heatmap.service';

const TEST_PLATFORM = 'google';
const TEST_PAGE_TYPE = 'review_form';
const TEST_PAGE_URL = 'https://www.google.com/maps/reviews';

/**
 * Génère une heat map avec suffisamment de points pour forcer l'enregistrement
 */
function generateHeatMapWithSave() {
  console.log('Génération d\'une heat map avec sauvegarde forcée...');
  
  // Tailles d'écran
  const viewportWidth = 1280;
  const viewportHeight = 800;
  
  // Générer 60 points (le seuil de sauvegarde est de 50)
  const pointCount = 60;
  const pointTypes = ['click', 'hover', 'scroll', 'type', 'move'];
  
  for (let i = 0; i < pointCount; i++) {
    // Coordonnées aléatoires
    const x = Math.floor(Math.random() * viewportWidth);
    const y = Math.floor(Math.random() * viewportHeight);
    
    // Type aléatoire
    const type = pointTypes[Math.floor(Math.random() * pointTypes.length)];
    
    // Enregistrer le point
    interactionHeatmap.recordInteraction(
      TEST_PLATFORM,
      TEST_PAGE_URL,
      TEST_PAGE_TYPE,
      {
        x,
        y,
        type: type as any,
        timestamp: new Date(),
        viewportWidth,
        viewportHeight
      }
    );
  }
  
  console.log(`${pointCount} points d'interaction enregistrés.`);
  
  // Attendre un peu pour permettre la sauvegarde asynchrone
  setTimeout(() => {
    console.log('\nVérification du fichier sauvegardé:');
    const heatMapPath = path.join('./data/heatmaps', `google__maps_reviews.json`);
    
    if (fs.existsSync(heatMapPath)) {
      const stats = fs.statSync(heatMapPath);
      console.log(`Fichier trouvé: ${heatMapPath}`);
      console.log(`Taille: ${stats.size} octets`);
      console.log(`Dernière modification: ${stats.mtime}`);
    } else {
      console.error(`Fichier non trouvé: ${heatMapPath}`);
    }
    
    console.log('\nTest terminé.');
  }, 1000);
}

/**
 * Fonction principale
 */
function main() {
  console.log('Test des heat maps avec sauvegarde forcée...');
  
  // Créer le répertoire de données si nécessaire
  const dataDir = './data/heatmaps';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Générer une heat map
  generateHeatMapWithSave();
}

// Exécuter le script
main();