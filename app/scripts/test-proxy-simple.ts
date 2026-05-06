/**
 * Test simplifié des proxies et de la configuration
 * 
 * Ce script teste les proxies actuellement configurés dans la base de données
 * et vérifie si les configurations sont optimisées pour Google.
 */

import { db } from './server/db';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execSync } from 'child_process';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

async function main() {
  console.log("=== TEST SIMPLIFIÉ DES PROXIES ===");

  try {
    // Vérifier que la base de données est accessible
    console.log("Vérification de la connexion à la base de données...");
    
    // Exécuter une requête SQL directe pour récupérer les proxies
    // car il semble y avoir un problème avec l'import des types
    const result = await db.execute(`
      SELECT * FROM proxies
      WHERE status = 'active'
      LIMIT 10
    `);
    
    const proxies = result.rows;
    console.log(`${proxies.length} proxies actifs trouvés dans la base de données.`);
    
    if (proxies.length === 0) {
      console.log("Aucun proxy actif trouvé.");
      return;
    }
    
    // Vérifier les configurations pour Google
    let googleOptimizedCount = 0;
    const googleProxies = [];
    
    for (const proxy of proxies) {
      if (proxy.options) {
        let options;
        
        // Convertir options en objet si c'est une chaîne JSON
        if (typeof proxy.options === 'string') {
          try {
            options = JSON.parse(proxy.options);
          } catch (e) {
            console.error(`Erreur lors du parsing des options: ${e.message}`);
            options = {};
          }
        } else {
          options = proxy.options;
        }
        
        // Vérifier les options spécifiques à Google
        const isGoogleOptimized = options.google_kyc === true || 
                                 options.google_optimize === true || 
                                 options.google_access === true;
        
        if (isGoogleOptimized) {
          googleOptimizedCount++;
          googleProxies.push({
            id: proxy.id,
            host: proxy.host,
            port: proxy.port,
            options: Object.keys(options).filter(key => key.includes('google') || key === 'session_sticky')
          });
        }
      }
    }
    
    console.log(`${googleOptimizedCount} proxies sont optimisés pour Google.`);
    
    if (googleProxies.length > 0) {
      console.log("\nDétails des proxies optimisés pour Google:");
      console.table(googleProxies);
    }
    
    // Enregistrer les résultats
    await mkdirAsync('./test_reports', { recursive: true });
    await writeFileAsync(
      './test_reports/proxy_test_results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        totalProxies: proxies.length,
        googleOptimizedProxies: googleOptimizedCount,
        googleProxies
      }, null, 2)
    );
    
    console.log("\nRésultats enregistrés dans ./test_reports/proxy_test_results.json");
    
    // Vérifier les variables d'environnement nécessaires
    console.log("\n=== VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT ===");
    
    const requiredVars = [
      'BRIGHT_DATA_USERNAME',
      'BRIGHT_DATA_PASSWORD',
      'OPENAI_API_KEY'
    ];
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      const isSet = typeof value === 'string' && value.length > 0;
      console.log(`${varName}: ${isSet ? "✅ Configurée" : "❌ Non configurée"}`);
    }
    
  } catch (error) {
    console.error("Erreur lors de l'exécution du test:", error);
  }
}

// Exécution du test
main()
  .then(() => {
    console.log("\n=== TEST TERMINÉ ===");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erreur non gérée:", error);
    process.exit(1);
  });