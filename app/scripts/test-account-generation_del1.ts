/**
 * Script de test de génération de compte unique
 * 
 * Ce script teste la génération d'un seul compte pour une plateforme spécifique
 * afin de vérifier le bon fonctionnement du système avant de lancer la génération massive.
 */

import { faker } from '@faker-js/faker';
import { db } from './server/db';
import { postingAccounts, proxies } from './shared/schema';
import { encryptionService } from './server/services/encryption.service';
import { logger } from './server/services/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

// Fonction pour générer un user-agent aléatoire depuis une liste prédéfinie
function generateRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.2277.112',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Configuration
const SUPPORTED_PLATFORMS = ['google', 'trustpilot', 'tripadvisor'];
const DEFAULT_PLATFORM = 'trustpilot';

// Type pour les résultats de test
type TestAccountResult = {
  platform: string;
  success: boolean;
  email?: string;
  password?: string;
  error?: string;
  proxy?: any;
  recoveryEmail?: string;
  duration: number;
  executionTime: string;
};

/**
 * Teste la création d'un compte pour une plateforme spécifique
 */
async function testAccountCreation(platform = DEFAULT_PLATFORM): Promise<TestAccountResult> {
  console.log(`🚀 Démarrage du test de création de compte pour ${platform.toUpperCase()}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Générer un profil aléatoire
    const profile = await generateRandomProfile();
    console.log(`👤 Profil généré: ${profile.firstName} ${profile.lastName} (${profile.email})`);
    
    // 2. Récupérer un proxy optimal
    console.log(`🔍 Récupération d'un proxy pour ${platform}...`);
    
    // Récupérer un proxy actif aléatoirement
    const proxyResults = await db.select().from(proxies).where(eq(proxies.status, 'active'));
    
    if (proxyResults.length === 0) {
      throw new Error('Aucun proxy actif disponible dans la base de données');
    }
    
    const randomIndex = Math.floor(Math.random() * proxyResults.length);
    const proxy = proxyResults[randomIndex];
    
    console.log(`📡 Proxy sélectionné: ID ${proxy.id}`);
    
    // 3. Simuler la création d'un compte
    // Dans un test réel, ce serait l'appel à un service de création de compte
    console.log(`🔄 Simulation de création de compte ${platform}...`);
    
    // Attendre un délai aléatoire pour simuler le processus
    const simulationTime = Math.floor(Math.random() * 3000) + 2000;
    await new Promise(resolve => setTimeout(resolve, simulationTime));
    
    // 4. Générer des informations de compte
    const email = profile.email;
    const password = profile.password;
    
    // 5. Enregistrer le compte dans la base de données
    console.log(`💾 Enregistrement du compte dans la base de données...`);
    
    // Chiffrer le mot de passe
    const encryptedPassword = await encryptionService.encryptForStorage(password);
    
    // Insérer le compte dans la base de données avec l'annotation "test"
    await db.insert(postingAccounts).values({
      platform,
      email,
      password: encryptedPassword,
      status: 'test', // Marquer comme compte de test
      proxyId: proxy.id,
      creationIp: '127.0.0.1', // IP fictive pour le test
      recoveryEmail: profile.recoveryEmail,
      accountConfidenceScore: 80,
      accountTier: 'test',
      activityPattern: 'test',
      priorityScore: 50,
      maxDailyUses: 2,
      maxConsecutiveUses: 2,
      reputationScore: 70,
      humanityScore: 80
    });
    
    // 6. Calculer la durée totale
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const executionTime = `${minutes} minute(s) et ${seconds} seconde(s)`;
    
    console.log(`✅ Compte ${platform} créé avec succès en ${executionTime}!`);
    
    // 7. Retourner le résultat
    return {
      platform,
      success: true,
      email,
      password,
      proxy,
      recoveryEmail: profile.recoveryEmail,
      duration,
      executionTime
    };
    
  } catch (error: any) {
    // En cas d'erreur
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const executionTime = `${minutes} minute(s) et ${seconds} seconde(s)`;
    
    console.error(`❌ Échec de la création du compte ${platform}: ${error.message}`);
    
    return {
      platform,
      success: false,
      error: error.message,
      duration,
      executionTime
    };
  }
}

/**
 * Génère un profil aléatoire pour les tests
 */
async function generateRandomProfile() {
  // Générer des données aléatoires avec faker
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  const email = faker.internet.email({ firstName, lastName }).toLowerCase();
  const password = `${faker.word.adjective()}${faker.number.int({ min: 100, max: 999 })}${faker.word.noun()}!`;
  const recoveryEmail = faker.internet.email().toLowerCase();
  
  const birthYear = faker.number.int({ min: 1970, max: 2000 });
  const birthMonth = faker.number.int({ min: 1, max: 12 });
  const birthDay = faker.number.int({ min: 1, max: 28 });
  
  const phoneNumber = faker.phone.number();
  
  return {
    firstName,
    lastName,
    email,
    password,
    recoveryEmail,
    birthYear,
    birthMonth,
    birthDay,
    phoneNumber
  };
}

/**
 * Sauvegarde le résultat du test dans un fichier
 */
async function saveTestResult(result: TestAccountResult): Promise<void> {
  try {
    // Créer le répertoire temp si nécessaire
    const tempDir = './temp/account-tests';
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    // Formater le résultat pour un rapport lisible
    let report = '========== RAPPORT DE TEST DE CRÉATION DE COMPTE ==========\n\n';
    report += `Date: ${new Date().toISOString()}\n`;
    report += `Plateforme: ${result.platform.toUpperCase()}\n`;
    report += `Statut: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}\n`;
    report += `Durée: ${result.executionTime}\n\n`;
    
    if (result.success) {
      report += 'Détails du compte créé:\n';
      report += `Email: ${result.email}\n`;
      report += `Mot de passe: ${result.password}\n`;
      report += `Email de récupération: ${result.recoveryEmail}\n`;
    } else {
      report += 'Détails de l\'erreur:\n';
      report += `Message: ${result.error}\n`;
    }
    
    report += '\n=======================================================\n';
    
    // Sauvegarder le rapport sous forme de texte
    const reportPath = path.join(tempDir, `account-test-${Date.now()}.txt`);
    await fs.promises.writeFile(reportPath, report);
    
    // Sauvegarder les données brutes en JSON
    const jsonPath = path.join(tempDir, `account-test-${Date.now()}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(result, null, 2));
    
    console.log(`📄 Rapport sauvegardé dans ${reportPath}`);
    console.log(`📄 Données brutes sauvegardées dans ${jsonPath}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du résultat:', error);
  }
}

/**
 * Fonction principale pour exécuter le test
 */
async function main() {
  try {
    // Récupérer la plateforme depuis les arguments de ligne de commande
    const args = process.argv.slice(2);
    const platform = args[0] || DEFAULT_PLATFORM;
    
    // Vérifier que la plateforme est supportée
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      console.error(`❌ Plateforme non supportée: ${platform}`);
      console.error(`📋 Plateformes supportées: ${SUPPORTED_PLATFORMS.join(', ')}`);
      process.exit(1);
    }
    
    // Exécuter le test
    const result = await testAccountCreation(platform);
    
    // Sauvegarder le résultat
    await saveTestResult(result);
    
    // Afficher un résumé
    console.log('\n📋 Résumé du test:');
    console.log(`Plateforme: ${result.platform.toUpperCase()}`);
    console.log(`Résultat: ${result.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
    if (result.success) {
      console.log(`Email: ${result.email}`);
      console.log(`Mot de passe: ${result.password}`);
    } else {
      console.log(`Erreur: ${result.error}`);
    }
    console.log(`Durée: ${result.executionTime}`);
    
  } catch (error: any) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});