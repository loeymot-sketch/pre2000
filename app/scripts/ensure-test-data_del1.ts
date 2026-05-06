/**
 * Script pour s'assurer que les données de test existent dans la base de données
 * 
 * Ce script vérifie et crée si nécessaire:
 * 1. Des comptes de test pour Google, Trustpilot et TripAdvisor
 * 2. Des entreprises de test pour chaque plateforme
 * 3. Des proxies actifs pour chaque plateforme
 */

import { db } from './server/db';
import * as schema from './shared/schema';
import { eq, and, or, asc } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

interface TestDataSummary {
  accounts: {
    [key: string]: number[];
  };
  businesses: {
    [key: string]: number[];
  };
  proxies: {
    [key: string]: number[];
  };
}

/**
 * Vérifie et crée les proxies nécessaires pour les tests
 */
async function ensureProxies(): Promise<{ [key: string]: number[] }> {
  console.log('Verifying proxy data...');
  const platforms = ['google', 'trustpilot', 'tripadvisor'];
  const proxiesMap: { [key: string]: number[] } = {};
  
  // Vérifier les proxies existants
  const existingProxies = await db.select().from(schema.proxies)
    .where(eq(schema.proxies.status, 'active'));
  
  if (existingProxies.length >= 3) {
    console.log(`Found ${existingProxies.length} active proxies`);
    
    // Assigner des proxies à chaque plateforme
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const proxy = existingProxies[i % existingProxies.length];
      
      if (!proxiesMap[platform]) {
        proxiesMap[platform] = [];
      }
      
      proxiesMap[platform].push(proxy.id);
      console.log(`Assigned proxy ${proxy.id} (${proxy.host}:${proxy.port}) to ${platform}`);
    }
    
    return proxiesMap;
  }
  
  // Si pas assez de proxies, créer des nouveaux
  console.log('Not enough active proxies, creating test proxies...');
  
  // Paramètres de proxy BrightData par défaut
  const defaultProxyParams = {
    host: 'brd.superproxy.io',
    port: 33335,
    type: 'residential',
    country: 'US',
    username: 'brd-customer-hl_' + process.env.BRIGHT_DATA_USERNAME,
    password: process.env.BRIGHT_DATA_PASSWORD,
    status: 'active',
    options: JSON.stringify({
      session: 'random',
      keep_alive: true,
      ssl: true
    }),
    success_rate: '100',
    average_latency: 1200,
    consecutive_failures: 0,
    total_successes: 100,
    total_failures: 0
  };
  
  for (const platform of platforms) {
    // Créer un proxy pour chaque plateforme
    const result = await db.insert(schema.proxies).values({
      ...defaultProxyParams,
      notes: `Test proxy for ${platform}`
    }).returning({ id: schema.proxies.id });
    
    if (result.length > 0) {
      if (!proxiesMap[platform]) {
        proxiesMap[platform] = [];
      }
      proxiesMap[platform].push(result[0].id);
      console.log(`Created new proxy ${result[0].id} for ${platform}`);
    }
  }
  
  return proxiesMap;
}

/**
 * Vérifie et crée les entreprises nécessaires pour les tests
 */
async function ensureBusinesses(): Promise<{ [key: string]: number[] }> {
  console.log('Verifying business data...');
  const platforms = ['google', 'trustpilot', 'tripadvisor'];
  const businessesMap: { [key: string]: number[] } = {};
  
  for (const platform of platforms) {
    // Vérifier si une entreprise existe déjà pour cette plateforme
    const existingBusinesses = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.type, platform));
    
    if (existingBusinesses.length > 0) {
      if (!businessesMap[platform]) {
        businessesMap[platform] = [];
      }
      businessesMap[platform].push(existingBusinesses[0].id);
      console.log(`Found existing business ${existingBusinesses[0].id} (${existingBusinesses[0].name}) for ${platform}`);
      continue;
    }
    
    // Créer une entreprise pour cette plateforme
    const businessName = faker.company.name();
    const result = await db.insert(schema.businesses).values({
      name: businessName,
      type: platform,
      description: faker.company.catchPhrase(),
      websiteUrl: faker.internet.url(),
      products: faker.commerce.product(),
      keywords: faker.commerce.department(),
      userId: 1, // Utilisateur par défaut
    }).returning({ id: schema.businesses.id });
    
    if (result.length > 0) {
      if (!businessesMap[platform]) {
        businessesMap[platform] = [];
      }
      businessesMap[platform].push(result[0].id);
      console.log(`Created new business ${result[0].id} (${businessName}) for ${platform}`);
    }
  }
  
  return businessesMap;
}

/**
 * Vérifie et crée les comptes nécessaires pour les tests
 */
async function ensureAccounts(proxiesMap: { [key: string]: number[] }): Promise<{ [key: string]: number[] }> {
  console.log('Verifying account data...');
  const platforms = ['google', 'trustpilot', 'tripadvisor'];
  const accountsMap: { [key: string]: number[] } = {};
  
  for (const platform of platforms) {
    // Vérifier si un compte existe déjà pour cette plateforme
    const existingAccounts = await db.select().from(schema.postingAccounts)
      .where(and(
        eq(schema.postingAccounts.platform, platform),
        eq(schema.postingAccounts.status, 'active')
      ));
    
    if (existingAccounts.length > 0) {
      if (!accountsMap[platform]) {
        accountsMap[platform] = [];
      }
      accountsMap[platform].push(existingAccounts[0].id);
      console.log(`Found existing account ${existingAccounts[0].id} (${existingAccounts[0].email}) for ${platform}`);
      continue;
    }
    
    // Créer un compte pour cette plateforme
    const email = faker.internet.email();
    const proxyId = proxiesMap[platform] ? proxiesMap[platform][0] : null;
    
    const result = await db.insert(schema.postingAccounts).values({
      platform,
      email,
      password: faker.internet.password(),
      status: 'active',
      createdAt: new Date(),
      proxyId,
      reviewCount: 0,
      consecutiveUses: 0,
      recoveryEmail: faker.internet.email(),
      phoneNumber: faker.phone.number(),
      creationIp: faker.internet.ip(),
      accountTier: 'standard',
      riskLevel: 'low'
    }).returning({ id: schema.postingAccounts.id });
    
    if (result.length > 0) {
      if (!accountsMap[platform]) {
        accountsMap[platform] = [];
      }
      accountsMap[platform].push(result[0].id);
      console.log(`Created new account ${result[0].id} (${email}) for ${platform}`);
    }
  }
  
  return accountsMap;
}

/**
 * Fonction principale qui s'assure que toutes les données de test existent
 */
async function ensureTestData(): Promise<TestDataSummary> {
  console.log('Ensuring test data exists...');
  
  // 1. S'assurer que les proxies existent
  const proxiesMap = await ensureProxies();
  
  // 2. S'assurer que les entreprises existent
  const businessesMap = await ensureBusinesses();
  
  // 3. S'assurer que les comptes existent
  const accountsMap = await ensureAccounts(proxiesMap);
  
  return {
    accounts: accountsMap,
    businesses: businessesMap,
    proxies: proxiesMap
  };
}

// Exécuter la fonction principale
ensureTestData()
  .then(summary => {
    console.log('\n=== TEST DATA SUMMARY ===');
    
    console.log('\nAccounts:');
    Object.entries(summary.accounts).forEach(([platform, ids]) => {
      console.log(`- ${platform}: ${ids.join(', ')}`);
    });
    
    console.log('\nBusinesses:');
    Object.entries(summary.businesses).forEach(([platform, ids]) => {
      console.log(`- ${platform}: ${ids.join(', ')}`);
    });
    
    console.log('\nProxies:');
    Object.entries(summary.proxies).forEach(([platform, ids]) => {
      console.log(`- ${platform}: ${ids.join(', ')}`);
    });
    
    console.log('\n✅ Test data verification completed successfully.');
  })
  .catch(error => {
    console.error('Error ensuring test data:', error);
    process.exit(1);
  });