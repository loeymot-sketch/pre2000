/**
 * Script pour créer des comptes de test avec correspondance géographique aux proxies
 * 
 * Ce script crée des comptes de test pour Google, Trustpilot et TripAdvisor
 * avec des pays correspondant aux proxies existants (FR, UK, DE)
 */

import { db } from './server/db';
import * as schema from './shared/schema';
import { eq, and } from 'drizzle-orm';
import { faker } from '@faker-js/faker';
import fs from 'fs';

const LOG_FILE = 'geo-test-accounts.log';

// Configuration
const PLATFORMS = ['google', 'trustpilot', 'tripadvisor'];
const COUNTRIES = ['FR', 'UK', 'DE'];

// Fonction pour journaliser
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Récupère les proxies par pays
 */
async function getProxiesByCountry() {
  const proxies = await db.select({
    id: schema.proxies.id,
    country: schema.proxies.country,
    host: schema.proxies.host,
    port: schema.proxies.port,
    status: schema.proxies.status
  }).from(schema.proxies)
    .where(eq(schema.proxies.status, 'active'));
  
  const proxyMap = new Map<string, number>();
  
  for (const proxy of proxies) {
    if (proxy.country) {
      proxyMap.set(proxy.country, proxy.id);
      log(`Trouvé proxy ID ${proxy.id} pour le pays ${proxy.country} (${proxy.host}:${proxy.port})`);
    }
  }
  
  return proxyMap;
}

/**
 * Crée un compte de test pour une plateforme et un pays spécifiques
 */
async function createAccountForCountry(platform: string, country: string, proxyId: number) {
  // Vérifier si un compte existe déjà (simplifié pour éviter les erreurs de colonne)
  console.log(`Requête: SELECT * FROM posting_accounts WHERE platform = '${platform}' AND country = '${country}' AND status = 'active'`);
  
  try {
    const existingAccounts = await db.select({
      id: schema.postingAccounts.id,
      platform: schema.postingAccounts.platform,  
      country: schema.postingAccounts.country,
      status: schema.postingAccounts.status
    }).from(schema.postingAccounts)
      .where(and(
        eq(schema.postingAccounts.platform, platform),
        eq(schema.postingAccounts.country, country),
        eq(schema.postingAccounts.status, 'active')
      ));
    
    if (existingAccounts.length > 0) {
      log(`Le compte ${platform} pour le pays ${country} existe déjà (ID: ${existingAccounts[0].id})`);
      return existingAccounts[0];
    }
  } catch (error) {
    log(`Erreur lors de la vérification des comptes existants: ${error.message}`);
  }
  
  // Générer des données d'utilisateur
  const email = `test.${platform.toLowerCase()}.${country.toLowerCase()}@example.com`;
  const password = `Test${country}${platform}123!`;
  
  log(`Création d'un compte ${platform} pour le pays ${country}...`);
  
  // Sélection des champs minimums nécessaires pour créer un compte
  const newAccount = {
    platform: platform,
    email: email,
    password: password,
    status: 'active',
    country: country,
    proxyId: proxyId,
    reviewCount: 0,
    consecutiveUses: 0,
    consecutiveFailures: 0,
    preferredLanguage: country === 'FR' ? 'fr' : country === 'DE' ? 'de' : 'en'
  };
  
  try {
    const result = await db.insert(schema.postingAccounts).values(newAccount).returning();
    
    if (result.length > 0) {
      log(`✅ Compte créé pour ${platform} (${country}) avec l'ID ${result[0].id}`);
      return result[0];
    } else {
      log(`❌ Erreur lors de la création du compte ${platform} pour ${country}`);
      return null;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Fonction principale
 */
async function main() {
  log('Démarrage de la création des comptes de test géographiques');
  
  // Récupérer les proxies par pays
  const proxyMap = await getProxiesByCountry();
  log(`Proxies disponibles par pays: ${Array.from(proxyMap.entries()).map(([country, id]) => `${country}: ${id}`).join(', ')}`);
  
  // Créer des comptes pour chaque pays et chaque plateforme
  const createdAccounts = [];
  let countByPlatform: Record<string, number> = {};
  let countByCountry: Record<string, number> = {};
  
  for (const country of COUNTRIES) {
    countByCountry[country] = 0;
    const proxyId = proxyMap.get(country);
    if (!proxyId) {
      log(`⚠️ Pas de proxy trouvé pour le pays ${country}`);
      continue;
    }
    
    for (const platform of PLATFORMS) {
      if (!countByPlatform[platform]) countByPlatform[platform] = 0;
      
      const account = await createAccountForCountry(platform, country, proxyId);
      if (account) {
        createdAccounts.push({
          id: account.id,
          platform: platform,
          country: country
        });
        countByPlatform[platform]++;
        countByCountry[country]++;
      }
    }
  }
  
  // Résumé
  log('\n===== RÉSUMÉ =====');
  log(`Comptes créés: ${createdAccounts.length}`);
  
  log('\nComptes par plateforme:');
  for (const platform of PLATFORMS) {
    log(`- ${platform}: ${countByPlatform[platform] || 0} comptes`);
  }
  
  log('\nComptes par pays:');
  for (const country of COUNTRIES) {
    log(`- ${country}: ${countByCountry[country] || 0} comptes`);
  }
  
  log('Fin du processus de création des comptes de test géographiques');
}

// Exécuter le script
main()
  .catch(error => {
    log(`Erreur: ${error.message}`);
    console.error(error);
  });