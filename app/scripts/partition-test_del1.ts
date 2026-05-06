/**
 * Script de test pour le partitionnement des comptes
 * 
 * Ce script permet de tester la fonctionnalité de partitionnement des comptes
 * et de vérifier la sélection intelligente des comptes pour différents scénarios.
 */

import { storage } from "./server/storage";
import { logger } from "./server/services/logger.service";
import { accountPartitioningService } from "./server/services/account-partitioning.service";
import { faker } from "@faker-js/faker";
import { encryptionService } from "./server/services/encryption.service";
import { PostingAccount } from "@shared/schema";

/**
 * Génère des comptes de test avec des caractéristiques variées
 * pour simuler un environnement avec de nombreux comptes.
 */
async function generateTestAccounts(count: number, platform: string): Promise<PostingAccount[]> {
  console.log(`Génération de ${count} comptes de test pour ${platform}...`);
  const accounts: PostingAccount[] = [];
  
  // Caractéristiques variées pour simuler différents profils
  const accountTiers = ["standard", "premium", "vip"];
  const regions = ["europe", "north_america", "asia"];
  const countries = ["fr", "us", "uk", "de", "es", "ca", "jp", "sg"];
  
  for (let i = 0; i < count; i++) {
    try {
      // Générer des données aléatoires
      const email = faker.internet.email();
      const password = faker.internet.password();
      
      // Chiffrer les données sensibles
      const encryptedEmail = await encryptionService.encryptForStorage(email);
      const encryptedPassword = await encryptionService.encryptForStorage(password);
      
      // Calculer les dates en fonction de l'ancienneté
      const ageInDays = faker.number.int({ min: 1, max: 180 });
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - ageInDays);
      
      // Choisir des caractéristiques variées
      const tier = accountTiers[faker.number.int({ min: 0, max: 2 })];
      const region = regions[faker.number.int({ min: 0, max: 2 })];
      const country = countries[faker.number.int({ min: 0, max: 7 })];
      
      // Créer le compte avec des caractéristiques variées
      const account = await storage.createPostingAccount({
        platform,
        email: encryptedEmail,
        password: encryptedPassword,
        status: "active",
        reviewCount: faker.number.int({ min: 0, max: 20 }),
        creationIp: faker.internet.ipv4(),
        lastSuccessfulIp: faker.internet.ipv4(),
        consecutiveUses: faker.number.int({ min: 0, max: 5 }),
        lastUsedCountry: country,
        accountConfidenceScore: faker.number.int({ min: 30, max: 95 }),
        accountTier: tier,
        regionalSpecialization: region,
        humanityScore: faker.number.int({ min: 40, max: 90 }),
        warmingSessions: faker.number.int({ min: 0, max: 15 }),
        sessionSuccessRate: faker.number.int({ min: 70, max: 100 }),
      });
      
      // Mettre à jour la date de création (car le createPostingAccount utilise defaultNow())
      await storage.updatePostingAccount(account.id, {
        createdAt
      });
      
      accounts.push(account);
      
      if (i % 10 === 0) {
        console.log(`Créé ${i} comptes...`);
      }
    } catch (error) {
      console.error("Erreur lors de la création d'un compte test:", error);
    }
  }
  
  console.log(`${accounts.length} comptes de test créés avec succès pour ${platform}`);
  return accounts;
}

/**
 * Initialise le partitionnement pour les comptes générés
 */
async function initializePartitioning(): Promise<void> {
  console.log("Initialisation du partitionnement...");
  
  // Essayer différentes stratégies de partitionnement
  const strategies = [
    "geographic", 
    "performance", 
    "age", 
    "risk", 
    "balanced"
  ] as const;
  
  for (const strategy of strategies) {
    console.log(`Initialisation du partitionnement avec stratégie: ${strategy}`);
    const result = await accountPartitioningService.initializePartitioning(strategy);
    console.log(`Résultat de l'initialisation (${strategy}):`, {
      success: result.success,
      groupsCreated: result.groupsCreated,
      accountsProcessed: result.accountsProcessed
    });
  }
}

/**
 * Teste la sélection des comptes dans différents scénarios
 */
async function testAccountSelection(): Promise<void> {
  console.log("\nTest de la sélection des comptes...");
  
  const platforms = ["google", "trustpilot"];
  const riskLevels = ["low", "medium", "high"] as const;
  const countries = ["fr", "us", "uk", null];
  
  // Tester toutes les combinaisons
  for (const platform of platforms) {
    for (const riskLevel of riskLevels) {
      for (const country of countries) {
        console.log(`\nSélection pour: platform=${platform}, riskLevel=${riskLevel}, country=${country || 'any'}`);
        
        try {
          // Utiliser directement le service de partitionnement
          const taskPriority = riskLevel === 'high' ? 'low' : riskLevel === 'low' ? 'high' : 'medium';
          
          console.log("Sélection via partitionnement...");
          const accountFromPartitioning = await accountPartitioningService.selectOptimalAccountWithPartitioning(
            platform,
            country || undefined,
            taskPriority as any
          );
          
          if (accountFromPartitioning) {
            console.log(`Compte sélectionné via partitionnement:`, {
              id: accountFromPartitioning.id,
              platform: accountFromPartitioning.platform,
              accountTier: accountFromPartitioning.accountTier,
              accountGroup: accountFromPartitioning.accountGroup,
              priorityScore: accountFromPartitioning.priorityScore,
              reviewCount: accountFromPartitioning.reviewCount,
              lastUsedCountry: accountFromPartitioning.lastUsedCountry
            });
          } else {
            console.log("Aucun compte trouvé via partitionnement");
          }
        } catch (error) {
          console.error("Erreur lors de la sélection:", error);
        }
      }
    }
  }
}

/**
 * Nettoie les comptes de test créés pour ne pas polluer la base de données
 */
async function cleanupTestAccounts(accounts: PostingAccount[]): Promise<void> {
  console.log("\nNettoyage des comptes de test...");
  
  // Exécuter directement des requêtes SQL pour supprimer les comptes
  try {
    // On récupère les IDs pour le log
    const accountIds = accounts.map(a => a.id);
    
    // Supprimer les comptes créés par le test
    await storage.db.execute(
      `DELETE FROM posting_accounts WHERE id IN (${accountIds.join(',')})`
    );
    
    console.log(`${accountIds.length} comptes de test supprimés`);
  } catch (error) {
    console.error("Erreur lors du nettoyage des comptes test:", error);
  }
}

/**
 * Fonction principale qui exécute tous les tests
 */
async function runPartitionTest() {
  try {
    console.log("== Test du système de partitionnement des comptes ==");
    
    // Générer des comptes de test (environ 100 pour chaque plateforme)
    const googleAccounts = await generateTestAccounts(50, "google");
    const trustpilotAccounts = await generateTestAccounts(50, "trustpilot");
    const allAccounts = [...googleAccounts, ...trustpilotAccounts];
    
    // Initialiser le partitionnement
    await initializePartitioning();
    
    // Tester la sélection des comptes
    await testAccountSelection();
    
    // Nettoyer les données de test
    await cleanupTestAccounts(allAccounts);
    
    console.log("\n== Test du système de partitionnement terminé avec succès ==");
  } catch (error) {
    console.error("Erreur lors du test de partitionnement:", error);
  } finally {
    // Assurez-vous de fermer la connexion à la base de données
    try {
      console.log("Fermeture de la connexion à la base de données...");
      await storage.db.disconnect();
      console.log("Connexion fermée.");
    } catch (err) {
      console.error("Erreur lors de la fermeture de la connexion:", err);
    }
    process.exit(0);
  }
}

// Exécuter le test
runPartitionTest();