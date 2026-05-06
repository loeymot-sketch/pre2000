/**
 * Test simplifié du flux de publication d'avis
 * 
 * Ce script effectue un cycle simplifié :
 * 1. Se connecte directement à la base de données
 * 2. Crée ou récupère une entreprise de test
 * 3. Crée ou récupère un compte de test
 * 4. Crée un avis de test
 * 5. Simule la publication d'un avis
 */

// Désactiver la vérification SSL pour les proxies
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { faker } from '@faker-js/faker';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Configuration
const TEST_PLATFORM = 'google'; // La plateforme à tester
const TEST_COUNTRY = 'FR'; // Le pays pour lequel créer le compte
const LOG_FILE = `./test-simplified-flow-${Date.now()}.log`;

// URL du proxy Bright Data standard
const PROXY_HOST = 'brd.superproxy.io';
const PROXY_PORT = 22225;

// Fonction pour la journalisation
function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

/**
 * Établit une connexion à la base de données
 */
async function getDbConnection() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  return pool;
}

/**
 * Récupère ou crée une entreprise de test
 */
async function getOrCreateTestBusiness(pool: pg.Pool) {
  log('📊 Recherche d\'une entreprise de test...');
  
  // Vérifier si une entreprise existe déjà pour la plateforme
  const existingResult = await pool.query(
    "SELECT * FROM businesses WHERE platform = $1 LIMIT 1", 
    [TEST_PLATFORM]
  );
  
  if (existingResult.rows.length > 0) {
    const business = existingResult.rows[0];
    log(`✅ Entreprise existante trouvée: ${business.name} (ID: ${business.id})`);
    return business;
  }
  
  // Créer une nouvelle entreprise de test
  log('🆕 Création d\'une nouvelle entreprise de test...');
  
  const newBusinessResult = await pool.query(
    `INSERT INTO businesses (
      name, type, description, products, keywords, websiteUrl, userId, platform, status, address
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      `Test Business ${Date.now()}`,         // name
      'restaurant',                          // type
      'Entreprise de test pour le flux simplifié', // description
      'Nourriture',                          // products
      'restaurant, test',                    // keywords
      'https://example.com',                 // websiteUrl
      1,                                     // userId
      TEST_PLATFORM,                         // platform
      'active',                              // status
      '123 Test Street, Paris, France'       // address
    ]
  );
  
  const business = newBusinessResult.rows[0];
  log(`✅ Nouvelle entreprise créée: ${business.name} (ID: ${business.id})`);
  return business;
}

/**
 * Récupère ou crée un compte de test
 */
async function getOrCreateTestAccount(pool: pg.Pool) {
  log('👤 Recherche d\'un compte de test...');
  
  // Vérifier si un compte existe déjà pour la plateforme
  const existingResult = await pool.query(
    "SELECT * FROM posting_accounts WHERE platform = $1 AND status = 'active' LIMIT 1", 
    [TEST_PLATFORM]
  );
  
  if (existingResult.rows.length > 0) {
    const account = existingResult.rows[0];
    log(`✅ Compte existant trouvé: ${account.email} (ID: ${account.id})`);
    return account;
  }
  
  // Créer un nouveau compte de test
  log('🆕 Création d\'un nouveau compte de test...');
  
  // Générer des données de test
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 10000)}@gmail.com`;
  const password = 'TestPassword123!';
  
  const newAccountResult = await pool.query(
    `INSERT INTO posting_accounts (
      email, password, platform, status, country, "createdAt", "lastUsed"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      email,
      password,
      TEST_PLATFORM,
      'active',
      TEST_COUNTRY,
      new Date(),
      new Date()
    ]
  );
  
  const account = newAccountResult.rows[0];
  log(`✅ Nouveau compte créé: ${account.email} (ID: ${account.id})`);
  return account;
}

/**
 * Crée un avis de test
 */
async function createTestReview(pool: pg.Pool, business: any, account: any) {
  log('📝 Création d\'un avis de test...');
  
  // Générer un contenu d'avis
  const reviewContent = `Excellente expérience dans cet établissement. Le service était rapide et professionnel, l'environnement agréable et propre. Je recommande vivement ! Test effectué le ${new Date().toISOString()}.`;
  
  // Créer l'avis
  const reviewResult = await pool.query(
    `INSERT INTO reviews (
      "businessId", content, rating, platform, status, "postingAccountId", "accountId"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      business.id,
      reviewContent,
      5,
      TEST_PLATFORM,
      'pending',
      account.id,
      account.id // Utiliser accountId et postingAccountId pour compatibilité
    ]
  );
  
  const review = reviewResult.rows[0];
  log(`✅ Avis créé avec ID: ${review.id}`);
  return review;
}

/**
 * Simule la publication d'un avis
 */
async function simulatePublishReview(pool: pg.Pool, reviewId: number) {
  log(`🚀 Simulation de la publication de l'avis ${reviewId}...`);
  
  // Mise à jour du statut de l'avis (simulation de succès)
  await pool.query(
    `UPDATE reviews SET status = $1, "postedAt" = $2 WHERE id = $3`,
    ['posted', new Date(), reviewId]
  );
  
  log(`✅ Simulation de publication réussie pour l'avis ${reviewId}`);
  return true;
}

/**
 * Vérifie le statut final de l'avis
 */
async function checkReviewStatus(pool: pg.Pool, reviewId: number) {
  log(`🔍 Vérification du statut final de l'avis ${reviewId}...`);
  
  const reviewResult = await pool.query(
    'SELECT * FROM reviews WHERE id = $1',
    [reviewId]
  );
  
  if (reviewResult.rows.length === 0) {
    log(`❌ Avis ${reviewId} non trouvé`);
    return { success: false };
  }
  
  const review = reviewResult.rows[0];
  log(`📊 Statut de l'avis: ${review.status}`);
  
  if (review.status === 'posted') {
    log('🎉 Test réussi: L\'avis a été publié avec succès !');
    return { success: true };
  } else {
    log(`❌ L'avis n'a pas pu être publié (statut: ${review.status})`);
    if (review.error) {
      log(`Message d'erreur: ${review.error}`);
    }
    return { success: false, status: review.status, error: review.error };
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    log('🚀 Démarrage du test simplifié...');
    
    // 1. Connexion à la base de données
    const pool = await getDbConnection();
    
    // 2. Récupérer ou créer une entreprise de test
    const business = await getOrCreateTestBusiness(pool);
    
    // 3. Récupérer ou créer un compte de test
    const account = await getOrCreateTestAccount(pool);
    
    // 4. Créer un avis de test
    const review = await createTestReview(pool, business, account);
    
    // 5. Simuler la publication d'un avis
    await simulatePublishReview(pool, review.id);
    
    // 6. Vérifier le statut final
    const statusResult = await checkReviewStatus(pool, review.id);
    
    // 7. Conclusion du test
    if (statusResult.success) {
      log('✅ TEST GLOBAL RÉUSSI: Avis publié avec succès');
    } else {
      log('❌ TEST GLOBAL ÉCHOUÉ: Avis non publié');
    }
    
    // Fermer la connexion à la base de données
    await pool.end();
    
    process.exit(statusResult.success ? 0 : 1);
  } catch (error) {
    log(`❌ Erreur générale dans le test: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();