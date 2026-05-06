/**
 * Initialisation des proxies de test
 * 
 * Script pour ajouter des proxies de test à la base de données
 * Utilise les identifiants Bright Data configurés dans l'environnement
 */

import { storage } from './server/storage';
import fs from 'fs';

// Configuration
const LOG_FILE = `./proxy-init-${Date.now()}.log`;

function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

async function initializeProxies() {
  try {
    log('🚀 Initialisation des proxies de test...');
    
    // Vérifier les identifiants Bright Data
    if (!process.env.BRIGHT_DATA_USERNAME || !process.env.BRIGHT_DATA_PASSWORD) {
      log('❌ Les identifiants Bright Data sont manquants dans les variables d\'environnement');
      process.exit(1);
    }
    
    // Obtenir le nombre actuel de proxies
    const existingProxies = await storage.getProxies();
    log(`ℹ️ Nombre de proxies existants: ${existingProxies.length}`);
    
    if (existingProxies.length > 0) {
      log('⚠️ Des proxies existent déjà dans la base de données');
      
      // Chercher les proxies par pays
      const frProxies = existingProxies.filter(p => p.country === 'FR');
      const ukProxies = existingProxies.filter(p => p.country === 'UK');
      const deProxies = existingProxies.filter(p => p.country === 'DE');
      
      log(`ℹ️ Proxies par pays: FR: ${frProxies.length}, UK: ${ukProxies.length}, DE: ${deProxies.length}`);
      
      // Si nous avons au moins un proxy pour chaque pays, terminer
      if (frProxies.length > 0 && ukProxies.length > 0 && deProxies.length > 0) {
        log('✅ Des proxies existent déjà pour tous les pays requis');
        
        // Mettre à jour les identifiants si nécessaire
        for (const proxy of existingProxies) {
          if (proxy.username !== process.env.BRIGHT_DATA_USERNAME || 
              proxy.password !== process.env.BRIGHT_DATA_PASSWORD) {
            
            log(`🔄 Mise à jour des identifiants pour le proxy ${proxy.id} (${proxy.country})`);
            await storage.updateProxy(proxy.id, {
              username: process.env.BRIGHT_DATA_USERNAME,
              password: process.env.BRIGHT_DATA_PASSWORD,
              status: 'active'
            });
          }
        }
        
        log('✅ Tous les proxies sont à jour avec les bons identifiants');
        return;
      }
    }
    
    // Modèles de proxies par pays
    const proxyTemplates = [
      {
        host: 'brd.superproxy.io',
        port: 22225,
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD,
        type: 'residential',
        country: 'FR',
        city: 'Paris',
        provider: 'Bright Data',
        status: 'active',
        lastChecked: new Date(),
        consecutiveSuccesses: 0,
        consecutiveFailures: 0
      },
      {
        host: 'brd.superproxy.io',
        port: 22225,
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD,
        type: 'residential',
        country: 'UK',
        city: 'London',
        provider: 'Bright Data',
        status: 'active',
        lastChecked: new Date(),
        consecutiveSuccesses: 0,
        consecutiveFailures: 0
      },
      {
        host: 'brd.superproxy.io',
        port: 22225,
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD,
        type: 'residential',
        country: 'DE',
        city: 'Berlin',
        provider: 'Bright Data',
        status: 'active',
        lastChecked: new Date(),
        consecutiveSuccesses: 0,
        consecutiveFailures: 0
      }
    ];
    
    // Ajouter les proxies par pays s'ils n'existent pas déjà
    for (const template of proxyTemplates) {
      const countryProxies = existingProxies.filter(p => p.country === template.country);
      
      if (countryProxies.length === 0) {
        log(`🆕 Création d'un proxy pour ${template.country}...`);
        const proxy = await storage.createProxy(template);
        log(`✅ Proxy créé pour ${template.country} avec ID: ${proxy.id}`);
      } else {
        log(`ℹ️ Un proxy pour ${template.country} existe déjà (ID: ${countryProxies[0].id})`);
      }
    }
    
    // Vérifier que tous les pays ont maintenant un proxy
    const updatedProxies = await storage.getProxies();
    const countriesWithProxies = [...new Set(updatedProxies.map(p => p.country))];
    
    log(`\n📊 Résumé des proxies par pays: ${countriesWithProxies.join(', ')}`);
    log(`✅ Initialisation des proxies terminée. ${updatedProxies.length} proxies disponibles.`);
    
  } catch (error) {
    log(`❌ Erreur lors de l'initialisation des proxies: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

initializeProxies();