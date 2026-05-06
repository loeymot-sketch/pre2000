/**
 * Tests de validation de l'infrastructure
 * 
 * Ce script exécute une série de tests pour valider l'infrastructure
 * et s'assurer que tous les composants nécessaires fonctionnent correctement.
 */

import { SimpleLogger } from './shared/utils/logger';
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { advancedProxyIntegration } from './advanced-proxy-integration';
import { advancedAccountManager } from './advanced-account-manager';
import { massiveParallelDistribution } from './massive-parallel-distribution';
import { enhancedSecurityShield } from './enhanced-security-shield';
import { adaptiveAnomalyDetection } from './adaptive-anomaly-detection';
import { advancedBiometricSimulation } from './advanced-biometric-simulation';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from './shared/schema';

const logger = new SimpleLogger('infrastructure-validation-test');

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Exécute les tests de validation de l'infrastructure
 */
async function runInfrastructureTests() {
  logger.info('Démarrage des tests de validation de l'infrastructure...');
  
  const results: TestResult[] = [];
  
  // Test 1: Connexion à la base de données
  results.push(await testDatabaseConnection());
  
  // Test 2: Schéma de la base de données
  results.push(await testDatabaseSchema());
  
  // Test 3: Proxies BrightData
  results.push(await testBrightDataProxies());
  
  // Test 4: Gestionnaire de comptes
  results.push(await testAccountManager());
  
  // Test 5: Système de distribution
  results.push(await testDistributionSystem());
  
  // Test 6: Bouclier de sécurité
  results.push(await testSecurityShield());
  
  // Test 7: Détection d'anomalies
  results.push(await testAnomalyDetection());
  
  // Test 8: Simulation biométrique
  results.push(await testBiometricSimulation());
  
  // Test 9: Répertoires de données
  results.push(await testDataDirectories());
  
  // Test 10: Variables d'environnement
  results.push(await testEnvironmentVariables());
  
  // Afficher le résumé des tests
  displayTestSummary(results);
  
  // Enregistrer les résultats des tests
  saveTestResults(results);
  
  // Vérifier s'il y a des échecs
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    logger.error(`${failedTests.length} tests ont échoué. Voir le rapport pour plus de détails.`);
    process.exit(1);
  } else {
    logger.info('Tous les tests ont réussi !');
    process.exit(0);
  }
}

/**
 * Test de connexion à la base de données
 */
async function testDatabaseConnection(): Promise<TestResult> {
  try {
    logger.info('Test de connexion à la base de données...');
    
    await db.execute(sql`SELECT 1`);
    
    return {
      name: 'Connexion à la base de données',
      success: true,
      message: 'Connexion à la base de données réussie.'
    };
  } catch (error) {
    logger.error(`Erreur lors du test de connexion à la base de données: ${error.message}`);
    
    return {
      name: 'Connexion à la base de données',
      success: false,
      message: `Échec de la connexion à la base de données: ${error.message}`
    };
  }
}

/**
 * Test du schéma de la base de données
 */
async function testDatabaseSchema(): Promise<TestResult> {
  try {
    logger.info('Test du schéma de la base de données...');
    
    const tables = [
      'businesses',
      'posting_accounts',
      'proxies',
      'reviews',
      'review_schedules',
      'users'
    ];
    
    const missingTables: string[] = [];
    const missingColumns: Record<string, string[]> = {};
    
    // Vérifier l'existence des tables
    for (const table of tables) {
      try {
        await db.execute(sql`SELECT 1 FROM ${sql.identifier(table)} LIMIT 1`);
      } catch (error) {
        missingTables.push(table);
      }
    }
    
    // Vérifier les colonnes spécifiques qui ont posé problème
    try {
      await db.execute(sql`SELECT rating FROM reviews LIMIT 1`);
    } catch (error) {
      if (!missingColumns['reviews']) missingColumns['reviews'] = [];
      missingColumns['reviews'].push('rating');
    }
    
    try {
      await db.execute(sql`SELECT platform FROM businesses LIMIT 1`);
    } catch (error) {
      if (!missingColumns['businesses']) missingColumns['businesses'] = [];
      missingColumns['businesses'].push('platform');
    }
    
    try {
      await db.execute(sql`SELECT last_status_change FROM proxies LIMIT 1`);
    } catch (error) {
      if (!missingColumns['proxies']) missingColumns['proxies'] = [];
      missingColumns['proxies'].push('last_status_change');
    }
    
    if (missingTables.length === 0 && Object.keys(missingColumns).length === 0) {
      return {
        name: 'Schéma de la base de données',
        success: true,
        message: 'Toutes les tables et colonnes nécessaires existent.'
      };
    } else {
      return {
        name: 'Schéma de la base de données',
        success: false,
        message: 'Problèmes détectés dans le schéma de la base de données.',
        details: {
          missingTables,
          missingColumns
        }
      };
    }
  } catch (error) {
    logger.error(`Erreur lors du test du schéma de la base de données: ${error.message}`);
    
    return {
      name: 'Schéma de la base de données',
      success: false,
      message: `Erreur lors du test du schéma de la base de données: ${error.message}`
    };
  }
}

/**
 * Test des proxies BrightData
 */
async function testBrightDataProxies(): Promise<TestResult> {
  try {
    logger.info('Test des proxies BrightData...');
    
    // Initialiser le système d'intégration de proxies
    await advancedProxyIntegration.initialize();
    
    // Tenter de récupérer un proxy
    const proxy = await advancedProxyIntegration.getProxy({
      country: 'FR',
      platform: 'google'
    });
    
    if (!proxy) {
      return {
        name: 'Proxies BrightData',
        success: false,
        message: 'Impossible d\'obtenir un proxy. Vérifiez les identifiants BrightData.'
      };
    }
    
    // Tester le proxy
    const testResult = await advancedProxyIntegration.testProxy(proxy);
    
    if (testResult.success) {
      return {
        name: 'Proxies BrightData',
        success: true,
        message: 'Proxy BrightData fonctionnel.',
        details: {
          ip: testResult.ip,
          country: testResult.country,
          latency: testResult.latency
        }
      };
    } else {
      return {
        name: 'Proxies BrightData',
        success: false,
        message: `Échec du test de proxy: ${testResult.errorMessage}`,
        details: {
          proxy: `${proxy.host}:${proxy.port}`,
          errorMessage: testResult.errorMessage
        }
      };
    }
  } catch (error) {
    logger.error(`Erreur lors du test des proxies BrightData: ${error.message}`);
    
    return {
      name: 'Proxies BrightData',
      success: false,
      message: `Erreur lors du test des proxies BrightData: ${error.message}`
    };
  }
}

/**
 * Test du gestionnaire de comptes
 */
async function testAccountManager(): Promise<TestResult> {
  try {
    logger.info('Test du gestionnaire de comptes...');
    
    // Initialiser le gestionnaire de comptes
    const initialized = await advancedAccountManager.initialize();
    
    if (!initialized) {
      return {
        name: 'Gestionnaire de comptes',
        success: false,
        message: 'Échec de l\'initialisation du gestionnaire de comptes.'
      };
    }
    
    // Récupérer les statistiques du système
    const stats = await advancedAccountManager.getSystemStats();
    
    return {
      name: 'Gestionnaire de comptes',
      success: true,
      message: 'Gestionnaire de comptes fonctionnel.',
      details: stats
    };
  } catch (error) {
    logger.error(`Erreur lors du test du gestionnaire de comptes: ${error.message}`);
    
    return {
      name: 'Gestionnaire de comptes',
      success: false,
      message: `Erreur lors du test du gestionnaire de comptes: ${error.message}`
    };
  }
}

/**
 * Test du système de distribution
 */
async function testDistributionSystem(): Promise<TestResult> {
  try {
    logger.info('Test du système de distribution...');
    
    // Initialiser le système de distribution
    const initialized = await massiveParallelDistribution.initialize();
    
    if (!initialized) {
      return {
        name: 'Système de distribution',
        success: false,
        message: 'Échec de l\'initialisation du système de distribution.'
      };
    }
    
    // Récupérer les métriques du système
    const metrics = await massiveParallelDistribution.generateMetrics();
    
    return {
      name: 'Système de distribution',
      success: true,
      message: 'Système de distribution fonctionnel.',
      details: metrics
    };
  } catch (error) {
    logger.error(`Erreur lors du test du système de distribution: ${error.message}`);
    
    return {
      name: 'Système de distribution',
      success: false,
      message: `Erreur lors du test du système de distribution: ${error.message}`
    };
  }
}

/**
 * Test du bouclier de sécurité
 */
async function testSecurityShield(): Promise<TestResult> {
  try {
    logger.info('Test du bouclier de sécurité...');
    
    // Initialiser le bouclier de sécurité
    const initialized = await enhancedSecurityShield.initialize();
    
    if (!initialized) {
      return {
        name: 'Bouclier de sécurité',
        success: false,
        message: 'Échec de l\'initialisation du bouclier de sécurité.'
      };
    }
    
    // Vérifier si une opération est autorisée
    const checkResult = await enhancedSecurityShield.isOperationAllowed({
      operationType: 'post_review',
      platform: 'google'
    });
    
    return {
      name: 'Bouclier de sécurité',
      success: true,
      message: 'Bouclier de sécurité fonctionnel.',
      details: {
        operationAllowed: checkResult.allowed,
        securityLevel: checkResult.securityLevel
      }
    };
  } catch (error) {
    logger.error(`Erreur lors du test du bouclier de sécurité: ${error.message}`);
    
    return {
      name: 'Bouclier de sécurité',
      success: false,
      message: `Erreur lors du test du bouclier de sécurité: ${error.message}`
    };
  }
}

/**
 * Test de la détection d'anomalies
 */
async function testAnomalyDetection(): Promise<TestResult> {
  try {
    logger.info('Test de la détection d\'anomalies...');
    
    // Initialiser le système de détection d'anomalies
    const initialized = await adaptiveAnomalyDetection.initialize();
    
    if (!initialized) {
      return {
        name: 'Détection d\'anomalies',
        success: false,
        message: 'Échec de l\'initialisation du système de détection d\'anomalies.'
      };
    }
    
    // Simuler un événement pour tester la détection
    await adaptiveAnomalyDetection.recordEvent({
      eventType: 'login',
      platform: 'google',
      success: true
    });
    
    // Générer un rapport d'anomalies
    const report = await adaptiveAnomalyDetection.generateAnomalyReport();
    
    return {
      name: 'Détection d\'anomalies',
      success: true,
      message: 'Système de détection d\'anomalies fonctionnel.',
      details: {
        reportTimestamp: report.timestamp,
        recommendationsCount: report.recommendations.length
      }
    };
  } catch (error) {
    logger.error(`Erreur lors du test de la détection d'anomalies: ${error.message}`);
    
    return {
      name: 'Détection d\'anomalies',
      success: false,
      message: `Erreur lors du test de la détection d'anomalies: ${error.message}`
    };
  }
}

/**
 * Test de la simulation biométrique
 */
async function testBiometricSimulation(): Promise<TestResult> {
  try {
    logger.info('Test de la simulation biométrique...');
    
    // Initialiser le système de simulation biométrique
    const initialized = await advancedBiometricSimulation.initialize();
    
    if (!initialized) {
      return {
        name: 'Simulation biométrique',
        success: false,
        message: 'Échec de l\'initialisation du système de simulation biométrique.'
      };
    }
    
    // Sélectionner un profil
    const profile = await advancedBiometricSimulation.selectProfileForAccount(1, 'google');
    
    if (!profile) {
      return {
        name: 'Simulation biométrique',
        success: false,
        message: 'Impossible de sélectionner un profil biométrique.'
      };
    }
    
    // Générer un comportement de frappe
    const typing = await advancedBiometricSimulation.generateTypingBehavior({
      profile,
      text: 'Ceci est un test de simulation de frappe humaine.'
    });
    
    // Générer un mouvement de souris
    const mousePath = await advancedBiometricSimulation.generateMouseMovement({
      profile,
      startX: 100,
      startY: 100,
      endX: 500,
      endY: 300,
      withClick: true
    });
    
    return {
      name: 'Simulation biométrique',
      success: true,
      message: 'Système de simulation biométrique fonctionnel.',
      details: {
        profileId: profile.id,
        typingSpeed: typing.effectiveSpeed,
        mousePathPoints: mousePath.points.length
      }
    };
  } catch (error) {
    logger.error(`Erreur lors du test de la simulation biométrique: ${error.message}`);
    
    return {
      name: 'Simulation biométrique',
      success: false,
      message: `Erreur lors du test de la simulation biométrique: ${error.message}`
    };
  }
}

/**
 * Test des répertoires de données
 */
async function testDataDirectories(): Promise<TestResult> {
  try {
    logger.info('Test des répertoires de données...');
    
    const requiredDirectories = [
      path.join(process.cwd(), 'data'),
      path.join(process.cwd(), 'data', 'distribution_plans'),
      path.join(process.cwd(), 'data', 'account_partitions'),
      path.join(process.cwd(), 'data', 'security'),
      path.join(process.cwd(), 'data', 'security', 'proxy-pool'),
      path.join(process.cwd(), 'data', 'security', 'biometric-profiles'),
      path.join(process.cwd(), 'data', 'security', 'anomaly-patterns'),
      path.join(process.cwd(), 'data', 'reports')
    ];
    
    const missingDirectories: string[] = [];
    
    for (const dir of requiredDirectories) {
      if (!fs.existsSync(dir)) {
        missingDirectories.push(dir);
      }
    }
    
    if (missingDirectories.length === 0) {
      return {
        name: 'Répertoires de données',
        success: true,
        message: 'Tous les répertoires de données nécessaires existent.'
      };
    } else {
      return {
        name: 'Répertoires de données',
        success: false,
        message: 'Certains répertoires de données sont manquants.',
        details: {
          missingDirectories
        }
      };
    }
  } catch (error) {
    logger.error(`Erreur lors du test des répertoires de données: ${error.message}`);
    
    return {
      name: 'Répertoires de données',
      success: false,
      message: `Erreur lors du test des répertoires de données: ${error.message}`
    };
  }
}

/**
 * Test des variables d'environnement
 */
async function testEnvironmentVariables(): Promise<TestResult> {
  try {
    logger.info('Test des variables d\'environnement...');
    
    const requiredVariables = [
      'DATABASE_URL',
      'PGUSER',
      'PGPASSWORD',
      'PGDATABASE',
      'PGHOST',
      'PGPORT',
      'OPENAI_API_KEY',
      'BRIGHT_DATA_USERNAME',
      'BRIGHT_DATA_PASSWORD'
    ];
    
    const missingVariables: string[] = [];
    
    for (const variable of requiredVariables) {
      if (!process.env[variable]) {
        missingVariables.push(variable);
      }
    }
    
    if (missingVariables.length === 0) {
      return {
        name: 'Variables d\'environnement',
        success: true,
        message: 'Toutes les variables d\'environnement nécessaires sont définies.'
      };
    } else {
      return {
        name: 'Variables d\'environnement',
        success: false,
        message: 'Certaines variables d\'environnement sont manquantes.',
        details: {
          missingVariables
        }
      };
    }
  } catch (error) {
    logger.error(`Erreur lors du test des variables d'environnement: ${error.message}`);
    
    return {
      name: 'Variables d\'environnement',
      success: false,
      message: `Erreur lors du test des variables d'environnement: ${error.message}`
    };
  }
}

/**
 * Affiche le résumé des tests
 */
function displayTestSummary(results: TestResult[]): void {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  console.log('\n===== RÉSUMÉ DES TESTS D\'INFRASTRUCTURE =====');
  console.log(`Total: ${results.length} tests, ${successCount} réussis, ${failureCount} échoués`);
  console.log('=============================================');
  
  results.forEach(result => {
    const status = result.success ? '✅ RÉUSSI' : '❌ ÉCHEC';
    console.log(`${status} - ${result.name}`);
    console.log(`  ${result.message}`);
    
    if (!result.success && result.details) {
      console.log('  Détails:');
      console.log(`  ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n  ')}`);
    }
    
    console.log('---------------------------------------------');
  });
}

/**
 * Sauvegarde les résultats des tests
 */
function saveTestResults(results: TestResult[]): void {
  try {
    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `infrastructure-test-${timestamp}.json`);
    
    const report = {
      timestamp: new Date(),
      totalTests: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logger.info(`Rapport de test sauvegardé: ${reportPath}`);
  } catch (error) {
    logger.error(`Erreur lors de la sauvegarde des résultats de test: ${error.message}`);
  }
}

// Exécuter les tests si lancé directement
if (require.main === module) {
  runInfrastructureTests();
}

export { runInfrastructureTests };