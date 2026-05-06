/**
 * Script de test pour Doge Vision
 * 
 * Ce script génère 20 comptes et 20 commentaires pour le site https://www.doge-vision.com/en
 * Il s'agit d'un test à petite échelle avant le déploiement complet.
 */

import { faker } from '@faker-js/faker';
import { db } from './server/db';
import { postingAccounts, businesses, reviews, proxies } from './shared/schema';
import { captchaService } from './server/services/captcha.service';
import { encryptionService } from './server/services/encryption.service';
import { proxyService } from './server/services/proxy.service';
import { logger } from './server/services/logger.service';
import { AIService } from './server/services/ai.service';
import { eq } from 'drizzle-orm';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Assurez-vous que puppeteer utilisera le plugin stealth
puppeteer.use(StealthPlugin());

// Configuration
const CONFIG = {
  ACCOUNTS_TO_CREATE: 20,
  REVIEWS_TO_GENERATE: 20,
  TARGET_WEBSITE: 'https://www.doge-vision.com/en',
  BUSINESS_NAME: 'Doge Vision',
  BUSINESS_TYPE: 'Eyewear Store',
  BUSINESS_DESCRIPTION: 'Doge Vision is an innovative eyewear store offering stylish and affordable glasses.',
  BUSINESS_PRODUCTS: 'Glasses, Sunglasses, Contact Lenses, Eye Care Products',
  BUSINESS_KEYWORDS: 'eyewear, glasses, sunglasses, doge vision, affordable glasses, stylish glasses',
  TEST_PLATFORM: 'google', // La plateforme sur laquelle nous allons simuler les avis
  SLEEP_BETWEEN_ACCOUNTS: 60 * 1000, // 1 minute entre chaque création de compte
  SLEEP_BETWEEN_REVIEWS: 30 * 1000, // 30 secondes entre chaque création d'avis
  LOG_FILE: 'doge-vision-test-log.txt',
  RESULTS_DIR: 'temp/doge-vision-test',
};

// Types
type TestResult = {
  success: boolean;
  message: string;
  accountsCreated: number;
  reviewsGenerated: number;
  errors: string[];
  accounts: any[];
  reviews: any[];
};

class DogeVisionTester {
  private startTime: Date;
  private endTime: Date | null = null;
  private errors: string[] = [];
  private accounts: any[] = [];
  private generatedReviews: any[] = [];
  private businessId: number | null = null;
  private writeFileAsync = promisify(fs.writeFile);
  private mkdirAsync = promisify(fs.mkdir);
  private aiService: AIService;

  constructor() {
    this.startTime = new Date();
    this.aiService = new AIService();
  }

  private async createResultsDir() {
    try {
      await this.mkdirAsync(CONFIG.RESULTS_DIR, { recursive: true });
      console.log(`Répertoire ${CONFIG.RESULTS_DIR} créé ou déjà existant.`);
    } catch (error) {
      console.error(`Erreur lors de la création du répertoire ${CONFIG.RESULTS_DIR}:`, error);
    }
  }

  private async generateRandomProfile() {
    // Générer un profil utilisateur aléatoire
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    // Créer une adresse email avec le prénom et le nom
    const email = faker.internet.email({ firstName, lastName });
    
    // Mot de passe complexe mais mémorisable
    const password = `${faker.word.adjective()}${faker.number.int({ min: 100, max: 999 })}${faker.word.noun()}!`;
    
    // Email de récupération secondaire
    const recoveryEmail = faker.internet.email();
    
    // Date de naissance aléatoire pour un adulte
    const birthYear = faker.number.int({ min: 1970, max: 2000 });
    const birthMonth = faker.number.int({ min: 1, max: 12 });
    const birthDay = faker.number.int({ min: 1, max: 28 });
    
    // Numéro de téléphone
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

  private async getOrCreateBusiness() {
    try {
      // Vérifier si le business existe déjà
      const existingBusinesses = await db.select().from(businesses).where(eq(businesses.name, CONFIG.BUSINESS_NAME));
      
      if (existingBusinesses.length > 0) {
        this.businessId = existingBusinesses[0].id;
        console.log(`Entreprise "${CONFIG.BUSINESS_NAME}" trouvée avec l'ID ${this.businessId}`);
        return existingBusinesses[0];
      }
      
      // Si le business n'existe pas, le créer
      // D'abord, nous avons besoin de l'ID de l'utilisateur actuel
      const userId = 4; // ID de l'utilisateur qui existe déjà dans la base de données
      
      const [newBusiness] = await db.insert(businesses).values({
        userId,
        name: CONFIG.BUSINESS_NAME,
        type: CONFIG.BUSINESS_TYPE,
        description: CONFIG.BUSINESS_DESCRIPTION,
        products: CONFIG.BUSINESS_PRODUCTS,
        keywords: CONFIG.BUSINESS_KEYWORDS,
        websiteUrl: CONFIG.TARGET_WEBSITE
      }).returning();
      
      this.businessId = newBusiness.id;
      console.log(`Nouvelle entreprise "${CONFIG.BUSINESS_NAME}" créée avec l'ID ${this.businessId}`);
      
      return newBusiness;
    } catch (error: any) {
      console.error('Erreur lors de la création ou récupération du business:', error.message);
      throw error;
    }
  }

  private async createAccount() {
    try {
      // Générer un profil aléatoire
      const profile = await this.generateRandomProfile();
      
      // Obtenir un proxy pour la création du compte
      // Utiliser une méthode alternative pour obtenir un proxy valide
      const proxiesResult = await db.select().from(proxies).where(eq(proxies.status, 'active')).limit(5);
      if (proxiesResult.length === 0) {
        throw new Error('Aucun proxy disponible');
      }
      // Sélectionner un proxy aléatoire dans la liste
      const randomIndex = Math.floor(Math.random() * proxiesResult.length);
      const proxy = proxiesResult[randomIndex];
      
      // Chiffrer le mot de passe avant stockage
      const encryptedPassword = await encryptionService.encryptForStorage(profile.password);
      
      // Insérer le compte dans la base de données
      const [account] = await db.insert(postingAccounts).values({
        platform: CONFIG.TEST_PLATFORM,
        email: profile.email,
        password: encryptedPassword,
        creationIp: proxy?.host || 'unknown', // Utilisation sécurisée avec valeur par défaut
        proxyId: proxy?.id || null,
        status: 'active',
        accountConfidenceScore: 70, // Score de confiance initial
        accountTier: 'standard',
        activityPattern: 'medium',
        priorityScore: 50,
        maxDailyUses: 2,
        maxConsecutiveUses: 2,
        reputationScore: 60,
        humanityScore: 70,
      }).returning();
      
      // Ajouter à notre liste de comptes
      this.accounts.push({
        ...account,
        plainPassword: profile.password, // Uniquement pour le test, ne stockez jamais les mots de passe en clair en production !
      });
      
      console.log(`✅ Compte ${CONFIG.TEST_PLATFORM} créé avec succès: ${profile.email}`);
      
      return account;
    } catch (error: any) {
      const errorMessage = `Erreur lors de la création du compte: ${error.message}`;
      console.error(errorMessage);
      this.errors.push(errorMessage);
      return null;
    }
  }

  private async generateReview() {
    if (!this.businessId) {
      throw new Error('ID de business non défini. Veuillez d\'abord créer ou récupérer un business.');
    }
    
    try {
      // Récupérer un business pour générer un avis approprié
      const business = await db.select().from(businesses).where(eq(businesses.id, this.businessId)).limit(1);
      
      if (!business.length) {
        throw new Error(`Aucun business trouvé avec l'ID ${this.businessId}`);
      }
      
      // Générer un contenu d'avis via l'AIService
      let reviewContent = "";
      try {
        // Tenter d'utiliser l'API OpenAI pour générer un avis
        const generatedReviews = await this.aiService.generateReviews(business[0], 1);
        reviewContent = generatedReviews[0];
      } catch (error) {
        // Fallback: générer un avis basique si l'API échoue
        console.log('Utilisation du générateur de secours pour l\'avis...');
        reviewContent = this.generateFallbackReview(business[0]);
      }
      
      // Créer l'avis
      const [review] = await db.insert(reviews).values({
        businessId: this.businessId,
        content: reviewContent,
        platform: CONFIG.TEST_PLATFORM,
        status: 'pending', // L'avis est en attente de publication
      }).returning();
      
      // Ajouter à notre liste d'avis
      this.generatedReviews.push(review);
      
      console.log(`✅ Avis généré avec succès pour ${CONFIG.BUSINESS_NAME}`);
      console.log(`Contenu de l'avis: ${reviewContent.substring(0, 100)}...`);
      
      return review;
    } catch (error: any) {
      const errorMessage = `Erreur lors de la génération de l'avis: ${error.message}`;
      console.error(errorMessage);
      this.errors.push(errorMessage);
      return null;
    }
  }

  private generateFallbackReview(business: any): string {
    // Fallback pour générer un avis de base si l'API OpenAI n'est pas disponible
    const sentiments = [
      "J'adore", "J'apprécie beaucoup", "Je suis très satisfait de", "Je recommande", "Super expérience avec"
    ];
    
    const qualities = [
      "la qualité", "le service client", "le rapport qualité-prix", "le professionnalisme", "la rapidité"
    ];
    
    const conclusions = [
      "Je reviendrai certainement !", "À recommander sans hésitation !", "Une excellente adresse !", 
      "Très satisfait de mon expérience.", "Un must dans le domaine !"
    ];
    
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const quality = qualities[Math.floor(Math.random() * qualities.length)];
    const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
    
    return `${sentiment} ${business.name} pour ${quality}. Les ${business.products.toLowerCase()} sont excellents. ${conclusion}`;
  }

  private async saveResultsToFiles() {
    try {
      // Sauvegarder les comptes créés
      const accountsFile = path.join(CONFIG.RESULTS_DIR, 'created-accounts.json');
      await this.writeFileAsync(accountsFile, JSON.stringify(this.accounts, null, 2));
      console.log(`Comptes sauvegardés dans ${accountsFile}`);
      
      // Sauvegarder les avis générés
      const reviewsFile = path.join(CONFIG.RESULTS_DIR, 'generated-reviews.json');
      await this.writeFileAsync(reviewsFile, JSON.stringify(this.generatedReviews, null, 2));
      console.log(`Avis sauvegardés dans ${reviewsFile}`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats:', error);
    }
  }

  private async calculateTimeTaken() {
    this.endTime = new Date();
    const totalMs = this.endTime.getTime() - this.startTime.getTime();
    const minutes = Math.floor(totalMs / (60 * 1000));
    const seconds = Math.floor((totalMs % (60 * 1000)) / 1000);
    
    return { minutes, seconds, totalMs };
  }

  private async generateReport(): Promise<TestResult> {
    const time = await this.calculateTimeTaken();
    
    const result: TestResult = {
      success: this.accounts.length > 0 && this.generatedReviews.length > 0,
      message: `Test terminé: ${this.accounts.length} comptes et ${this.generatedReviews.length} avis créés`,
      accountsCreated: this.accounts.length,
      reviewsGenerated: this.generatedReviews.length,
      errors: this.errors,
      accounts: this.accounts.map(a => ({
        id: a.id,
        email: a.email,
        platform: a.platform
      })),
      reviews: this.generatedReviews
    };
    
    let report = '\n\n=========== RAPPORT DE TEST DOGE VISION ===========\n\n';
    report += `Date de début: ${this.startTime.toISOString()}\n`;
    report += `Date de fin: ${this.endTime?.toISOString()}\n`;
    report += `Durée totale: ${time.minutes} minutes, ${time.seconds} secondes\n\n`;
    
    report += `STATUS: ${result.success ? 'SUCCÈS' : 'ÉCHEC PARTIEL'}\n`;
    report += `Comptes créés: ${result.accountsCreated}/${CONFIG.ACCOUNTS_TO_CREATE}\n`;
    report += `Avis générés: ${result.reviewsGenerated}/${CONFIG.REVIEWS_TO_GENERATE}\n\n`;
    
    if (result.errors.length > 0) {
      report += 'ERREURS:\n';
      result.errors.forEach((err, index) => {
        report += `${index + 1}. ${err}\n`;
      });
      report += '\n';
    }
    
    report += `Business: ${CONFIG.BUSINESS_NAME} (ID: ${this.businessId})\n`;
    report += `Plateforme: ${CONFIG.TEST_PLATFORM}\n\n`;
    
    report += 'Exemple d\'avis généré:\n';
    if (this.generatedReviews.length > 0) {
      report += `"${this.generatedReviews[0].content}"\n\n`;
    } else {
      report += "Aucun avis disponible.\n\n";
    }
    
    report += `Résultats sauvegardés dans: ${CONFIG.RESULTS_DIR}\n`;
    report += '=====================================================\n';
    
    console.log(report);
    
    // Sauvegarder le rapport dans un fichier
    await this.writeFileAsync(CONFIG.LOG_FILE, report);
    console.log(`Rapport sauvegardé dans ${CONFIG.LOG_FILE}`);
    
    return result;
  }

  public async run(): Promise<TestResult> {
    console.log('🚀 Démarrage du test pour Doge Vision');
    console.log(`Objectif: Créer ${CONFIG.ACCOUNTS_TO_CREATE} comptes et générer ${CONFIG.REVIEWS_TO_GENERATE} avis`);
    
    await this.createResultsDir();
    
    // Étape 1: Récupérer ou créer le business Doge Vision
    console.log('\n--- ÉTAPE 1: PRÉPARATION DU BUSINESS ---');
    try {
      const business = await this.getOrCreateBusiness();
      console.log(`Business prêt: ${business.name} (ID: ${business.id})`);
    } catch (error: any) {
      console.error('❌ Échec de la préparation du business:', error.message);
      this.errors.push(`Échec de la préparation du business: ${error.message}`);
      return {
        success: false,
        message: `Échec de la préparation du business: ${error.message}`,
        accountsCreated: 0,
        reviewsGenerated: 0,
        errors: this.errors,
        accounts: [],
        reviews: []
      };
    }
    
    // Étape 2: Créer les comptes
    console.log('\n--- ÉTAPE 2: CRÉATION DES COMPTES ---');
    for (let i = 0; i < CONFIG.ACCOUNTS_TO_CREATE; i++) {
      console.log(`\nCréation du compte ${i + 1}/${CONFIG.ACCOUNTS_TO_CREATE}`);
      
      await this.createAccount();
      
      if (i < CONFIG.ACCOUNTS_TO_CREATE - 1) {
        // Pause entre les créations, sauf pour le dernier
        console.log(`Pause de ${CONFIG.SLEEP_BETWEEN_ACCOUNTS / 1000} secondes...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.SLEEP_BETWEEN_ACCOUNTS));
      }
    }
    
    console.log(`\n✅ Création de comptes terminée. ${this.accounts.length}/${CONFIG.ACCOUNTS_TO_CREATE} comptes créés.`);
    
    // Étape 3: Générer les avis
    console.log('\n--- ÉTAPE 3: GÉNÉRATION DES AVIS ---');
    for (let i = 0; i < CONFIG.REVIEWS_TO_GENERATE; i++) {
      console.log(`\nGénération de l'avis ${i + 1}/${CONFIG.REVIEWS_TO_GENERATE}`);
      
      await this.generateReview();
      
      if (i < CONFIG.REVIEWS_TO_GENERATE - 1) {
        // Pause entre les générations, sauf pour le dernier
        console.log(`Pause de ${CONFIG.SLEEP_BETWEEN_REVIEWS / 1000} secondes...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.SLEEP_BETWEEN_REVIEWS));
      }
    }
    
    console.log(`\n✅ Génération d'avis terminée. ${this.generatedReviews.length}/${CONFIG.REVIEWS_TO_GENERATE} avis générés.`);
    
    // Sauvegarder les résultats et générer le rapport
    await this.saveResultsToFiles();
    const result = await this.generateReport();
    
    console.log(result.success ? 
      '✅ Test Doge Vision terminé avec succès !' : 
      '⚠️ Test Doge Vision terminé avec des avertissements.'
    );
    
    return result;
  }
}

// Fonction principale pour exécuter le script
async function main() {
  try {
    console.log('🔄 Initialisation du test Doge Vision...');
    const tester = new DogeVisionTester();
    await tester.run();
  } catch (error) {
    console.error('❌ Erreur fatale lors du test Doge Vision:', error);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});