/**
 * Test du service de nettoyage des traces
 * 
 * Ce script teste les fonctionnalités de nettoyage des fichiers temporaires,
 * des caches du navigateur et des autres traces laissées par l'application.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cleanupService } from '../services/cleanup.service';
import { logger } from '../services/logger.service';

interface TestResult {
  name: string;
  success: boolean;
  details?: any;
  error?: string;
}

class CleanupTester {
  private results: TestResult[] = [];
  private testFiles: string[] = [];
  private testDirs: string[] = [];

  constructor() {}

  /**
   * Exécute tous les tests du service de nettoyage
   */
  public async runTests(): Promise<TestResult[]> {
    try {
      console.log('🧹 Démarrage des tests du service de nettoyage...');
      
      // Initialisation des données de test
      await this.setup();
      
      // Tests
      await this.testAppTempCleanup();
      await this.testPuppeteerSessionCleanup();
      await this.testSystemTempCleanup();
      
      // Nettoyage des données de test
      await this.cleanup();
      
      // Affichage des résultats
      this.displayResults();
      
      return this.results;
    } catch (error) {
      console.error('Erreur lors des tests du service de nettoyage:', error);
      throw error;
    }
  }

  /**
   * Initialisation des données de test
   * Crée des fichiers et dossiers temporaires de test avec une date de modification ancienne
   */
  private async setup(): Promise<void> {
    console.log('🔧 Préparation de l\'environnement de test...');
    
    // Créer des dossiers temporaires
    const basePath = process.cwd();
    const testDirs = [
      path.join(basePath, 'temp', 'test_puppeteer_' + Date.now()),
      path.join(basePath, 'temp', 'test_browser_' + Date.now()),
      path.join(basePath, 'temp', 'test_app_' + Date.now())
    ];
    
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.testDirs.push(dir);
    }
    
    // Créer des fichiers de test
    const testFiles = [
      path.join(testDirs[0], 'test_file_1.txt'),
      path.join(testDirs[1], 'test_file_2.txt'),
      path.join(testDirs[2], 'test_file_3.txt')
    ];
    
    for (const file of testFiles) {
      fs.writeFileSync(file, 'Contenu de test pour le service de nettoyage - ' + Date.now());
      this.testFiles.push(file);
    }
    
    // Créer quelques fichiers/dossiers pour simuler une session Puppeteer
    const puppeteerSession = path.join(basePath, 'temp', 'user_data_' + Date.now());
    fs.mkdirSync(puppeteerSession, { recursive: true });
    fs.writeFileSync(
      path.join(puppeteerSession, 'Cookies'),
      'test_cookies_data'
    );
    fs.writeFileSync(
      path.join(puppeteerSession, 'Preferences'),
      JSON.stringify({ test: 'preferences_data' })
    );
    
    this.testDirs.push(puppeteerSession);
    
    // Modifier les dates de création/modification pour qu'elles soient plus anciennes
    // afin que le service de nettoyage les reconnaisse comme "vieux"
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 25); // 25 heures dans le passé (au-delà du MAX_AGE_HOURS)
    
    for (const dir of this.testDirs) {
      try {
        // Pour Linux/Unix uniquement
        await fs.promises.utimes(dir, oldDate, oldDate);
        console.log(`Date de modification de ${dir} modifiée à ${oldDate}`);
      } catch (err) {
        console.warn(`Impossible de modifier la date de ${dir}:`, err);
      }
    }
    
    for (const file of this.testFiles) {
      try {
        await fs.promises.utimes(file, oldDate, oldDate);
        console.log(`Date de modification de ${file} modifiée à ${oldDate}`);
      } catch (err) {
        console.warn(`Impossible de modifier la date de ${file}:`, err);
      }
    }
    
    await logger.log('cleanup_test_setup', {
      testDirs: this.testDirs,
      testFiles: this.testFiles
    });
    
    console.log(`✅ Environnement de test préparé avec ${this.testDirs.length} dossiers et ${this.testFiles.length} fichiers.`);
  }

  /**
   * Nettoyage des données de test si nécessaire
   */
  private async cleanup(): Promise<void> {
    console.log('🗑️ Nettoyage des données de test restantes...');
    
    // Supprimer les fichiers de test qui n'ont pas été nettoyés
    for (const file of this.testFiles) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.warn(`Impossible de supprimer le fichier de test: ${file}`, error);
        }
      }
    }
    
    // Supprimer les dossiers de test qui n'ont pas été nettoyés
    for (const dir of this.testDirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.rmdirSync(dir, { recursive: true });
        } catch (error) {
          console.warn(`Impossible de supprimer le dossier de test: ${dir}`, error);
        }
      }
    }
    
    await logger.log('cleanup_test_teardown', {
      remainingDirs: this.testDirs.filter(dir => fs.existsSync(dir)),
      remainingFiles: this.testFiles.filter(file => fs.existsSync(file))
    });
    
    console.log('✅ Nettoyage des données de test terminé.');
  }

  /**
   * Teste le nettoyage des dossiers temporaires de l'application
   */
  private async testAppTempCleanup(): Promise<void> {
    console.log('🧪 Test du nettoyage des dossiers temporaires de l\'application...');
    
    try {
      // Exécuter le nettoyage des dossiers temporaires de l'application avec le forçage du nettoyage des dossiers de test
      const result = await cleanupService.cleanupApplicationTemp(true);
      
      // Vérifier les résultats
      const successCount = this.testDirs.filter(dir => !fs.existsSync(dir)).length;
      const anyFilesOrDirsRemoved = result.directories > 0 || result.files > 0;
      const expectedSuccess = this.testDirs.length > 0;
      
      this.results.push({
        name: 'Nettoyage des dossiers temporaires de l\'application',
        success: anyFilesOrDirsRemoved && successCount > 0,
        details: {
          dirsCleanedCount: result.directories,
          filesCleanedCount: result.files,
          testedDirsRemoved: successCount,
          totalTestedDirs: this.testDirs.length
        }
      });
      
      console.log(`${anyFilesOrDirsRemoved ? '✅' : '❌'} Test du nettoyage des dossiers temporaires de l'application ${anyFilesOrDirsRemoved ? 'réussi' : 'échoué'}.`);
    } catch (error) {
      this.results.push({
        name: 'Nettoyage des dossiers temporaires de l\'application',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      console.error('❌ Test du nettoyage des dossiers temporaires de l\'application échoué:', error);
    }
  }

  /**
   * Teste le nettoyage des sessions Puppeteer
   */
  private async testPuppeteerSessionCleanup(): Promise<void> {
    console.log('🧪 Test du nettoyage des sessions Puppeteer...');
    
    try {
      // Exécuter le nettoyage spécifique aux sessions Puppeteer
      const result = await cleanupService.cleanupPuppeteerSession();
      
      // Vérifier si les dossiers de session Puppeteer ont été supprimés
      const puppeteerDirs = this.testDirs.filter(dir => dir.includes('user_data_'));
      const puppeteerDirsRemoved = puppeteerDirs.filter(dir => !fs.existsSync(dir)).length;
      
      this.results.push({
        name: 'Nettoyage des sessions Puppeteer',
        success: result && puppeteerDirsRemoved > 0,
        details: {
          result,
          puppeteerDirsTotal: puppeteerDirs.length,
          puppeteerDirsRemoved
        }
      });
      
      console.log(`${result ? '✅' : '❌'} Test du nettoyage des sessions Puppeteer ${result ? 'réussi' : 'échoué'}.`);
    } catch (error) {
      this.results.push({
        name: 'Nettoyage des sessions Puppeteer',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      console.error('❌ Test du nettoyage des sessions Puppeteer échoué:', error);
    }
  }

  /**
   * Teste le nettoyage des fichiers temporaires du système
   */
  private async testSystemTempCleanup(): Promise<void> {
    console.log('🧪 Test du nettoyage des fichiers temporaires du système...');
    
    try {
      // Exécuter le nettoyage des fichiers temporaires du système
      const result = await cleanupService.cleanupSystemTemp();
      
      // Vérifier si des fichiers temporaires ont été nettoyés
      const anyFilesOrDirsRemoved = result.directories > 0 || result.files > 0;
      
      this.results.push({
        name: 'Nettoyage des fichiers temporaires du système',
        success: anyFilesOrDirsRemoved,
        details: {
          dirsCleanedCount: result.directories,
          filesCleanedCount: result.files,
          errors: result.errors
        }
      });
      
      console.log(`${anyFilesOrDirsRemoved ? '✅' : '❌'} Test du nettoyage des fichiers temporaires du système ${anyFilesOrDirsRemoved ? 'réussi' : 'échoué'}.`);
    } catch (error) {
      this.results.push({
        name: 'Nettoyage des fichiers temporaires du système',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      console.error('❌ Test du nettoyage des fichiers temporaires du système échoué:', error);
    }
  }

  /**
   * Affiche un résumé des résultats des tests
   */
  private displayResults(): void {
    console.log('\n📊 Résultats des tests du service de nettoyage:');
    console.log('--------------------------------------------------');
    
    const successCount = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    
    console.log(`Total des tests: ${totalTests}`);
    console.log(`Tests réussis: ${successCount}`);
    console.log(`Tests échoués: ${totalTests - successCount}`);
    console.log('--------------------------------------------------');
    
    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: ${result.success ? '✅ Réussi' : '❌ Échoué'}`);
      if (result.error) {
        console.log(`   Erreur: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Détails: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
    
    console.log('--------------------------------------------------');
  }
}

/**
 * Exécute les tests du service de nettoyage
 */
export async function runCleanupTests(): Promise<void> {
  const tester = new CleanupTester();
  await tester.runTests();
}

// Pour ESM nous ne pouvons pas vérifier require.main === module
// donc nous exportons simplement la fonction runCleanupTests