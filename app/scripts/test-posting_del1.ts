/**
 * Script de test pour la publication sécurisée d'avis
 * 
 * Ce script permet de tester la publication d'avis sur Google et Trustpilot
 * en utilisant les mécanismes de sécurité implémentés.
 */

import dotenv from 'dotenv';
import { securePostingService } from '../services/secure-posting.service';
import db from '../config/database';

// Charger les variables d'environnement
dotenv.config();

/**
 * Fonction principale de test
 */
async function runTests() {
  try {
    console.log('Démarrage des tests de publication sécurisée d\'avis...');
    
    // Vérifier la connexion à la base de données
    await testDatabaseConnection();
    
    // Créer des données de test si nécessaire
    await createTestDataIfNeeded();
    
    // Tester la publication d'un avis Google
    await testGoogleReviewPosting();
    
    // Tester la publication d'un avis Trustpilot
    await testTrustpilotReviewPosting();
    
    console.log('Tests terminés avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors des tests:', error);
    process.exit(1);
  }
}

/**
 * Teste la connexion à la base de données
 */
async function testDatabaseConnection() {
  try {
    console.log('Test de connexion à la base de données...');
    const result = await db.query('SELECT NOW()');
    console.log(`Connexion à la base de données réussie: ${result.rows[0].now}`);
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    throw error;
  }
}

/**
 * Crée des données de test si nécessaire
 */
async function createTestDataIfNeeded() {
  console.log('Vérification des données de test...');
  
  // Vérifier s'il y a des comptes
  const accountsResult = await db.query('SELECT COUNT(*) FROM accounts');
  if (parseInt(accountsResult.rows[0].count) === 0) {
    console.log('Aucun compte trouvé, création de comptes de test...');
    await createTestAccounts();
  } else {
    console.log(`${accountsResult.rows[0].count} comptes trouvés.`);
  }
  
  // Vérifier s'il y a des proxies
  const proxiesResult = await db.query('SELECT COUNT(*) FROM proxies');
  if (parseInt(proxiesResult.rows[0].count) === 0) {
    console.log('Aucun proxy trouvé, création de proxies de test...');
    await createTestProxies();
  } else {
    console.log(`${proxiesResult.rows[0].count} proxies trouvés.`);
  }
  
  // Vérifier s'il y a des entreprises
  const businessesResult = await db.query('SELECT COUNT(*) FROM businesses');
  if (parseInt(businessesResult.rows[0].count) === 0) {
    console.log('Aucune entreprise trouvée, création d\'entreprises de test...');
    await createTestBusinesses();
  } else {
    console.log(`${businessesResult.rows[0].count} entreprises trouvées.`);
  }
}

/**
 * Crée des comptes de test
 */
async function createTestAccounts() {
  // Remplacer par vos propres comptes de test
  const testAccounts = [
    {
      email: 'test.account1@example.com',
      password: 'password123',
      platform: 'google',
      status: 'active',
      country: 'France',
      region: 'Île-de-France',
      city: 'Paris'
    },
    {
      email: 'test.account2@example.com',
      password: 'password123',
      platform: 'trustpilot',
      status: 'active',
      country: 'France',
      region: 'Île-de-France',
      city: 'Paris'
    }
  ];
  
  for (const account of testAccounts) {
    await db.query(
      'INSERT INTO accounts (email, password, platform, status, country, region, city) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [account.email, account.password, account.platform, account.status, account.country, account.region, account.city]
    );
  }
  
  console.log(`${testAccounts.length} comptes de test créés.`);
}

/**
 * Crée des proxies de test
 */
async function createTestProxies() {
  // Remplacer par vos propres proxies de test
  const testProxies = [
    {
      url: '127.0.0.1:8080',
      type: 'http',
      status: 'active',
      country: 'France',
      region: 'Île-de-France',
      city: 'Paris'
    },
    {
      url: '127.0.0.1:8081',
      type: 'http',
      status: 'active',
      country: 'France',
      region: 'Île-de-France',
      city: 'Paris'
    }
  ];
  
  for (const proxy of testProxies) {
    await db.query(
      'INSERT INTO proxies (url, type, status, country, region, city) VALUES ($1, $2, $3, $4, $5, $6)',
      [proxy.url, proxy.type, proxy.status, proxy.country, proxy.region, proxy.city]
    );
  }
  
  console.log(`${testProxies.length} proxies de test créés.`);
}

/**
 * Crée des entreprises de test
 */
async function createTestBusinesses() {
  // Remplacer par vos propres entreprises de test
  const testBusinesses = [
    {
      name: 'Restaurant Test',
      platform: 'google',
      platformId: 'ChIJxxxxxxxxxxxxxxxxxxxx', // Remplacer par un ID Google Maps valide
      country: 'France',
      region: 'Île-de-France',
      city: 'Paris'
    },
    {
      name: 'Entreprise Test',
      platform: 'trustpilot',
      platformId: 'entreprise-test', // Remplacer par un ID Trustpilot valide
      country: 'France',
      region: 'Île-de-France',
      city: 'Paris'
    }
  ];
  
  for (const business of testBusinesses) {
    await db.query(
      'INSERT INTO businesses (name, platform, platform_id, country, region, city) VALUES ($1, $2, $3, $4, $5, $6)',
      [business.name, business.platform, business.platformId, business.country, business.region, business.city]
    );
  }
  
  console.log(`${testBusinesses.length} entreprises de test créées.`);
}

/**
 * Teste la publication d'un avis Google
 */
async function testGoogleReviewPosting() {
  console.log('Test de publication d\'un avis Google...');
  
  // Récupérer une entreprise Google
  const businessResult = await db.query(
    'SELECT id FROM businesses WHERE platform = $1 LIMIT 1',
    ['google']
  );
  
  if (businessResult.rows.length === 0) {
    console.log('Aucune entreprise Google trouvée, test ignoré.');
    return;
  }
  
  const businessId = businessResult.rows[0].id;
  
  // Créer un avis de test
  const reviewResult = await db.query(
    'INSERT INTO reviews (business_id, content, title, rating, status, platform) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [
      businessId,
      'Excellent service, je recommande vivement cet établissement. L\'accueil était chaleureux et le personnel très professionnel.',
      'Très satisfait',
      5,
      'pending',
      'google'
    ]
  );
  
  const reviewId = reviewResult.rows[0].id;
  console.log(`Avis de test créé (ID: ${reviewId}).`);
  
  // Publier l'avis
  console.log('Publication de l\'avis...');
  const success = await securePostingService.publishReview(reviewId);
  
  if (success) {
    console.log('Publication de l\'avis Google réussie!');
  } else {
    console.log('Échec de la publication de l\'avis Google.');
    
    // Récupérer la raison de l'échec
    const failureResult = await db.query(
      'SELECT failure_reason FROM reviews WHERE id = $1',
      [reviewId]
    );
    
    if (failureResult.rows.length > 0 && failureResult.rows[0].failure_reason) {
      console.log(`Raison de l'échec: ${failureResult.rows[0].failure_reason}`);
    }
  }
}

/**
 * Teste la publication d'un avis Trustpilot
 */
async function testTrustpilotReviewPosting() {
  console.log('Test de publication d\'un avis Trustpilot...');
  
  // Récupérer une entreprise Trustpilot
  const businessResult = await db.query(
    'SELECT id FROM businesses WHERE platform = $1 LIMIT 1',
    ['trustpilot']
  );
  
  if (businessResult.rows.length === 0) {
    console.log('Aucune entreprise Trustpilot trouvée, test ignoré.');
    return;
  }
  
  const businessId = businessResult.rows[0].id;
  
  // Créer un avis de test
  const reviewResult = await db.query(
    'INSERT INTO reviews (business_id, content, title, rating, status, platform) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [
      businessId,
      'J\'ai eu une expérience très positive avec cette entreprise. Le service client est réactif et les produits sont de qualité. Je n\'hésiterai pas à faire appel à eux à nouveau.',
      'Service client exceptionnel',
      5,
      'pending',
      'trustpilot'
    ]
  );
  
  const reviewId = reviewResult.rows[0].id;
  console.log(`Avis de test créé (ID: ${reviewId}).`);
  
  // Publier l'avis
  console.log('Publication de l\'avis...');
  const success = await securePostingService.publishReview(reviewId);
  
  if (success) {
    console.log('Publication de l\'avis Trustpilot réussie!');
  } else {
    console.log('Échec de la publication de l\'avis Trustpilot.');
    
    // Récupérer la raison de l'échec
    const failureResult = await db.query(
      'SELECT failure_reason FROM reviews WHERE id = $1',
      [reviewId]
    );
    
    if (failureResult.rows.length > 0 && failureResult.rows[0].failure_reason) {
      console.log(`Raison de l'échec: ${failureResult.rows[0].failure_reason}`);
    }
  }
}

// Exécuter les tests
runTests();
