/**
 * Script optimisé pour créer des comptes de test avec correspondance géographique aux proxies
 * Version 2 avec support des nouvelles colonnes de cohérence géographique
 */

import { db } from './server/db';
import { postingAccounts } from './shared/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import { faker } from '@faker-js/faker';

const LOG_FILE = 'geo-accounts-creation.log';

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

interface ProxyInfo {
  id: number;
  country: string;
  city?: string;
  region?: string;
}

interface AccountConfig {
  platform: string;
  country: string;
  language: string;
  timezone?: string;
  region?: string;
  city?: string;
}

/**
 * Récupère les proxies par pays en utilisant des requêtes SQL directes
 */
async function getProxiesByCountry(): Promise<Record<string, ProxyInfo>> {
  try {
    // Utiliser une requête SQL directe pour éviter les problèmes avec le schéma
    const query = `
      SELECT id, country, city, region
      FROM proxies
      WHERE country IS NOT NULL AND country != ''
      AND status = 'active'
      ORDER BY id
    `;
    
    const result = await db.execute(query);
    
    // Vérifier le format du résultat
    let proxies = [];
    if (Array.isArray(result)) {
      proxies = result;
    } else if (result.rows && Array.isArray(result.rows)) {
      proxies = result.rows;
    } else {
      log(`Format de résultat inattendu pour getProxiesByCountry: ${JSON.stringify(result)}`);
      return {};
    }
    
    const proxyByCountry: Record<string, ProxyInfo> = {};
    
    for (const proxy of proxies) {
      if (proxy.country && proxy.id) {
        proxyByCountry[proxy.country] = {
          id: proxy.id,
          country: proxy.country,
          city: proxy.city || undefined,
          region: proxy.region || undefined
        };
      }
    }
    
    return proxyByCountry;
  } catch (error) {
    log(`❌ Erreur lors de la récupération des proxies: ${error.message}`);
    console.error(error);
    return {};
  }
}

/**
 * Vérifie si un compte existe déjà pour la plateforme et le pays
 */
async function accountExists(platform: string, country: string): Promise<boolean> {
  try {
    // Utiliser une requête SQL directe pour éviter les problèmes avec le schéma
    const query = `
      SELECT COUNT(*) as count
      FROM posting_accounts
      WHERE platform = $1 AND country = $2
    `;
    
    const result = await db.execute(query, [platform, country]);
    
    // Vérifier le format du résultat
    let count = 0;
    if (Array.isArray(result) && result.length > 0) {
      count = parseInt(result[0].count, 10);
    } else if (result.rows && Array.isArray(result.rows) && result.rows.length > 0) {
      count = parseInt(result.rows[0].count, 10);
    }
    
    return count > 0;
  } catch (error) {
    log(`❌ Erreur lors de la vérification de l'existence du compte: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Génère un mot de passe aléatoire sécurisé
 */
function generateSecurePassword(): string {
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz';
  const numberChars = '23456789';
  const specialChars = '!@#$%^&*()_+{}[];:<>,.?';
  
  const getRandomChar = (charSet: string) => charSet.charAt(Math.floor(Math.random() * charSet.length));
  
  // Au moins un de chaque catégorie
  let password = getRandomChar(uppercaseChars) + 
                getRandomChar(lowercaseChars) + 
                getRandomChar(numberChars) + 
                getRandomChar(specialChars);
  
  // Compléter avec des caractères aléatoires pour atteindre 12 caractères
  while (password.length < 12) {
    const charSetIndex = Math.floor(Math.random() * 4);
    const charSet = [uppercaseChars, lowercaseChars, numberChars, specialChars][charSetIndex];
    password += getRandomChar(charSet);
  }
  
  // Mélanger le mot de passe
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Génère une adresse email aléatoire pour les tests
 */
function generateTestEmail(platform: string, country: string): string {
  const randomString = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString().substring(8);
  return `test.${platform}.${country}.${randomString}${timestamp}@example.com`;
}

/**
 * Associe une langue au pays
 */
function getLanguageForCountry(country: string): string {
  const languageMap: Record<string, string> = {
    'FR': 'fr',
    'UK': 'en',
    'US': 'en',
    'DE': 'de',
    'ES': 'es',
    'IT': 'it',
    'PT': 'pt',
    'NL': 'nl'
  };
  
  return languageMap[country] || 'en';
}

/**
 * Obtient le fuseau horaire du pays
 */
function getTimezoneForCountry(country: string): string {
  const timezoneMap: Record<string, string> = {
    'FR': 'Europe/Paris',
    'UK': 'Europe/London',
    'US': 'America/New_York',
    'DE': 'Europe/Berlin',
    'ES': 'Europe/Madrid',
    'IT': 'Europe/Rome',
    'PT': 'Europe/Lisbon',
    'NL': 'Europe/Amsterdam'
  };
  
  return timezoneMap[country] || 'UTC';
}

/**
 * Retourne une ville principale du pays
 */
function getMajorCityForCountry(country: string): string | undefined {
  const cityMap: Record<string, string[]> = {
    'FR': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
    'UK': ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool'],
    'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
    'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza'],
    'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo'],
    'PT': ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Faro'],
    'NL': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven']
  };
  
  const cities = cityMap[country];
  if (!cities || cities.length === 0) return undefined;
  
  return cities[Math.floor(Math.random() * cities.length)];
}

/**
 * Retourne une région principale du pays
 */
function getRegionForCountry(country: string, city?: string): string | undefined {
  // Map de régions par pays
  const regionMap: Record<string, Record<string, string>> = {
    'FR': {
      'Paris': 'Île-de-France',
      'Lyon': 'Auvergne-Rhône-Alpes',
      'Marseille': 'Provence-Alpes-Côte d\'Azur',
      'Toulouse': 'Occitanie',
      'Nice': 'Provence-Alpes-Côte d\'Azur',
      'default': 'Île-de-France'
    },
    'UK': {
      'London': 'Greater London',
      'Manchester': 'North West England',
      'Birmingham': 'West Midlands',
      'Glasgow': 'Scotland',
      'Liverpool': 'North West England',
      'default': 'Greater London'
    },
    'DE': {
      'Berlin': 'Berlin',
      'Hamburg': 'Hamburg',
      'Munich': 'Bavaria',
      'Cologne': 'North Rhine-Westphalia',
      'Frankfurt': 'Hesse',
      'default': 'Berlin'
    },
    'default': {
      'default': undefined
    }
  };
  
  if (!regionMap[country]) return undefined;
  
  if (city && regionMap[country][city]) {
    return regionMap[country][city];
  }
  
  return regionMap[country]['default'];
}

/**
 * Crée un compte de test pour une plateforme et un pays spécifiques
 */
async function createAccountForCountry(config: AccountConfig, proxyId: number) {
  try {
    log(`Création d'un compte ${config.platform} pour le pays ${config.country}...`);
    
    // Vérifier si un compte existe déjà
    const exists = await accountExists(config.platform, config.country);
    if (exists) {
      log(`Un compte ${config.platform} pour ${config.country} existe déjà, création ignorée.`);
      return false;
    }
    
    const email = generateTestEmail(config.platform, config.country);
    const password = generateSecurePassword();
    const city = config.city || getMajorCityForCountry(config.country) || '';
    const region = config.region || getRegionForCountry(config.country, city) || '';
    const timezone = config.timezone || getTimezoneForCountry(config.country);
    const now = new Date().toISOString();
    
    // Création du compte avec une requête SQL directe
    const query = `
      INSERT INTO posting_accounts (
        platform, email, password, status, country, proxyId,
        reviewCount, consecutiveUses, consecutiveFailures,
        preferredLanguage, strictGeoMode, language, region, city, timezone,
        registrationIpCountry, dedicatedProxyId, regionalSpecialization,
        createdAt, updatedAt
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20
      )
      RETURNING id
    `;
    
    const params = [
      config.platform, email, password, 'active', config.country, proxyId,
      0, 0, 0,
      config.language, true, config.language, region, city, timezone,
      config.country, proxyId, config.country,
      now, now
    ];
    
    const result = await db.execute(query, params);
    
    log(`✅ Compte ${config.platform} pour ${config.country} créé avec succès: ${email}`);
    return true;
  } catch (error) {
    log(`❌ Erreur lors de la création du compte: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  log('Démarrage de la création des comptes de test géographiques optimisés');
  
  // Récupérer les proxies par pays
  const proxiesByCountry = await getProxiesByCountry();
  
  // Afficher les proxies disponibles
  const availableCountries = Object.keys(proxiesByCountry);
  if (availableCountries.length === 0) {
    log('❌ Aucun proxy disponible avec des pays spécifiés');
    return;
  }
  
  log(`Proxies disponibles pour les pays: ${availableCountries.join(', ')}`);
  
  // Plateformes à configurer
  const platforms = ['google', 'trustpilot', 'tripadvisor'];
  
  // Création des comptes par pays et plateforme
  for (const country of availableCountries) {
    const proxy = proxiesByCountry[country];
    if (!proxy) continue;
    
    log(`Traitement du pays: ${country} avec le proxy ID ${proxy.id}`);
    
    for (const platform of platforms) {
      const language = getLanguageForCountry(country);
      const timezone = getTimezoneForCountry(country);
      const city = proxy.city || getMajorCityForCountry(country);
      const region = proxy.region || getRegionForCountry(country, city);
      
      const accountConfig: AccountConfig = {
        platform,
        country,
        language,
        timezone,
        city,
        region
      };
      
      await createAccountForCountry(accountConfig, proxy.id);
    }
  }
  
  log('✅ Création des comptes terminée');
}

// Exécution du script
main()
  .catch(error => {
    log(`Erreur globale: ${error.message}`);
    console.error(error);
  })
  .finally(() => process.exit(0));