/**
 * Système de validation approfondie des comptes
 * 
 * Ce script vérifie l'état réel de tous les comptes avant le lancement d'une campagne
 * en testant l'authentification et évaluant la santé globale de chaque compte.
 * 
 * Fonctionnalités:
 * - Test d'authentification sur 100% des comptes
 * - Vérification de l'âge des comptes et exclusion des comptes trop récents
 * - Analyse des performances historiques
 * - Quarantaine des comptes à risque
 * - Rapport détaillé sur l'état du pool de comptes
 */

import { createClient } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { config } from 'dotenv';
import * as schema from './shared/schema';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
config();

// Initialiser la connexion à la base de données
const client = createClient({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle(client, { schema });

// Ajouter le plugin stealth
puppeteer.use(StealthPlugin());

// Configuration des plateformes pour les tests d'authentification
const PLATFORM_CONFIG = {
  google: {
    loginUrl: 'https://accounts.google.com/signin',
    successIndicators: [
      '[data-ogsr-up]', // Avatar de profil Google
      '[data-ogsr-fb]', // Menu utilisateur Google
      '[aria-label="Google Account"]' // Indicateur de compte connecté
    ],
    errorIndicators: [
      'Wrong password',
      'couldn\'t find your account',
      'suspicious activity',
      'unusual activity',
      'verify your identity',
      'confirm it\'s you',
      'account has been disabled'
    ],
    minAgeInDays: 15 // Âge minimum en jours
  },
  trustpilot: {
    loginUrl: 'https://www.trustpilot.com/authenticate',
    successIndicators: [
      'button.profile-button', // Avatar de profil Trustpilot
      '.profile-menu',
      '.user-menu-container'
    ],
    errorIndicators: [
      'account is temporarily suspended',
      'confirm your identity',
      'verification required',
      'suspicious activity',
      'incorrect email or password'
    ],
    minAgeInDays: 10
  },
  tripadvisor: {
    loginUrl: 'https://www.tripadvisor.com/Login',
    successIndicators: [
      '.membercenter',
      '.memName',
      '.masthead-avatar-wrap',
      '.Mebx button'
    ],
    errorIndicators: [
      'verify your account',
      'confirm your identity',
      'account has been suspended',
      'suspicious activity',
      'incorrect email or password'
    ],
    minAgeInDays: 21
  }
};

// Logs détaillés
function logToFile(message: string): void {
  const logDir = path.join(__dirname, 'logs');
  const logFile = path.join(logDir, 'account-validation.log');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`[AccountValidation] ${message}`);
}

// Calcule l'âge du compte en jours
function calculateAccountAge(createdAt: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Teste la validité de l'authentification d'un compte
 */
async function testAccountAuthentication(
  account: any,
  browser: Browser
): Promise<{
  success: boolean;
  reason?: string;
  issues: string[];
  recommendations: string[];
}> {
  const platform = account.platform;
  const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
  
  if (!config) {
    return {
      success: false,
      reason: `Plateforme non supportée: ${platform}`,
      issues: [`Configuration manquante pour la plateforme ${platform}`],
      recommendations: ['Implémenter le support pour cette plateforme']
    };
  }
  
  // Vérifier l'âge du compte
  const accountAge = calculateAccountAge(account.createdAt);
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  if (accountAge < config.minAgeInDays) {
    issues.push(`Compte trop récent (${accountAge} jours, minimum recommandé: ${config.minAgeInDays} jours)`);
    recommendations.push('Utiliser des comptes plus anciens pour cette plateforme');
  }
  
  // Ouvrir une nouvelle page
  const page = await browser.newPage();
  
  try {
    // Configuration basique
    await page.setViewport({ width: 1280, height: 800 });
    
    // User-Agent aléatoire
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    
    // Naviguer vers la page de connexion
    await page.goto(config.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Processus de connexion spécifique à chaque plateforme
    let authSuccess = false;
    let authError = '';
    
    switch (platform) {
      case 'google':
        // Connexion à Google
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', account.email, { delay: 100 });
        await page.click('#identifierNext');
        
        // Attendre le champ mot de passe
        try {
          await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
          
          // Attendre un peu avant de taper le mot de passe (comportement humain)
          await page.waitForTimeout(2000);
          
          await page.type('input[type="password"]', account.password, { delay: 100 });
          await page.click('#passwordNext');
          
          // Attendre la redirection
          await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
          
          // Vérifier s'il y a un message d'erreur
          const content = await page.content();
          
          // Vérifier les indicateurs d'erreur
          authError = config.errorIndicators.find(error => content.includes(error)) || '';
          
          // Vérifier les indicateurs de succès
          for (const selector of config.successIndicators) {
            if (await page.$(selector)) {
              authSuccess = true;
              break;
            }
          }
        } catch (e) {
          authError = `Erreur lors de la connexion: ${e}`;
        }
        break;
        
      case 'trustpilot':
        // Connexion à Trustpilot
        try {
          await page.waitForSelector('#email');
          await page.type('#email', account.email, { delay: 100 });
          await page.type('#password', account.password, { delay: 100 });
          
          await page.click('button[type="submit"]');
          
          // Attendre la redirection ou un message d'erreur
          await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
          
          // Vérifier s'il y a un message d'erreur
          const errorElement = await page.$('.login-error, .error-message');
          if (errorElement) {
            authError = await page.evaluate(el => el.textContent, errorElement);
          } else {
            const content = await page.content();
            
            // Vérifier les indicateurs d'erreur
            authError = config.errorIndicators.find(error => content.includes(error)) || '';
            
            // Vérifier les indicateurs de succès
            for (const selector of config.successIndicators) {
              if (await page.$(selector)) {
                authSuccess = true;
                break;
              }
            }
          }
        } catch (e) {
          authError = `Erreur lors de la connexion: ${e}`;
        }
        break;
        
      case 'tripadvisor':
        // Connexion à Tripadvisor
        try {
          await page.waitForSelector('#regSignIn');
          await page.click('#regSignIn');
          
          // Attendre le formulaire de connexion
          await page.waitForSelector('input[name="email"]', { visible: true });
          
          await page.type('input[name="email"]', account.email, { delay: 100 });
          await page.type('input[name="password"]', account.password, { delay: 100 });
          
          await page.click('button[type="submit"]');
          
          // Attendre la redirection ou un changement dans la page
          await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
          
          // Vérifier s'il y a un message d'erreur
          const errorElement = await page.$('.error, .formError, .errorMessage');
          if (errorElement) {
            authError = await page.evaluate(el => el.textContent, errorElement);
          } else {
            const content = await page.content();
            
            // Vérifier les indicateurs d'erreur
            authError = config.errorIndicators.find(error => content.includes(error)) || '';
            
            // Vérifier les indicateurs de succès
            for (const selector of config.successIndicators) {
              if (await page.$(selector)) {
                authSuccess = true;
                break;
              }
            }
          }
        } catch (e) {
          authError = `Erreur lors de la connexion: ${e}`;
        }
        break;
        
      default:
        authError = `Plateforme non supportée: ${platform}`;
        break;
    }
    
    // Ajouter des problèmes d'authentification si détectés
    if (authError) {
      issues.push(`Problème d'authentification: ${authError}`);
      recommendations.push('Vérifier les identifiants du compte');
    }
    
    // Vérifier l'historique des performances
    if (account.failureCount > 0) {
      const failureRatio = account.failureCount / (account.reviewCount || 1);
      
      if (failureRatio > 0.3) {
        issues.push(`Taux d'échec élevé (${(failureRatio * 100).toFixed(1)}%)`);
        recommendations.push('Remplacer ce compte ou surveiller étroitement');
      } else if (failureRatio > 0.1) {
        issues.push(`Taux d'échec notable (${(failureRatio * 100).toFixed(1)}%)`);
        recommendations.push('Surveiller les performances de ce compte');
      }
    }
    
    return {
      success: authSuccess && issues.length === 0,
      reason: authError || (issues.length > 0 ? issues[0] : undefined),
      issues,
      recommendations
    };
  } catch (error: any) {
    return {
      success: false,
      reason: `Erreur technique: ${error.message}`,
      issues: [`Erreur lors du test: ${error.message}`],
      recommendations: ['Réessayer le test plus tard']
    };
  } finally {
    await page.close();
  }
}

/**
 * Vérifie tous les comptes et met à jour leur statut
 */
async function verifyAllAccounts() {
  logToFile('Début de la vérification de tous les comptes...');
  
  try {
    // Récupérer tous les comptes
    const accounts = await db.select().from(schema.postingAccounts);
    
    if (!accounts.length) {
      logToFile('Aucun compte trouvé dans la base de données.');
      return;
    }
    
    logToFile(`${accounts.length} comptes trouvés. Début des tests d'authentification...`);
    
    // Lancer le navigateur
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800'
      ]
    });
    
    // Statistiques
    let verified = 0;
    let problematic = 0;
    let tooRecent = 0;
    let authFailed = 0;
    
    // Résultats par plateforme
    const resultsByPlatform: Record<string, { total: number, valid: number, invalid: number }> = {
      google: { total: 0, valid: 0, invalid: 0 },
      trustpilot: { total: 0, valid: 0, invalid: 0 },
      tripadvisor: { total: 0, valid: 0, invalid: 0 }
    };
    
    // Tester chaque compte
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      logToFile(`Test du compte ${i+1}/${accounts.length} (${account.email} - ${account.platform})...`);
      
      const platform = account.platform;
      if (resultsByPlatform[platform]) {
        resultsByPlatform[platform].total++;
      }
      
      // Vérifier l'âge du compte
      const accountAge = calculateAccountAge(account.createdAt);
      const minAge = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.minAgeInDays || 0;
      
      if (accountAge < minAge) {
        logToFile(`Compte ${account.email} trop récent (${accountAge} jours, minimum: ${minAge})`);
        tooRecent++;
        
        // Mise à jour du statut
        await db.update(schema.postingAccounts)
          .set({ 
            status: 'too_recent',
            updated_at: new Date(),
            validation_message: `Compte trop récent (${accountAge} jours)`
          })
          .where(schema.postingAccounts.id.equals(account.id));
        
        if (resultsByPlatform[platform]) {
          resultsByPlatform[platform].invalid++;
        }
        
        continue;
      }
      
      // Tester l'authentification
      const authResult = await testAccountAuthentication(account, browser);
      
      if (authResult.success) {
        logToFile(`Compte ${account.email} VALIDÉ`);
        verified++;
        
        // Mise à jour du statut
        await db.update(schema.postingAccounts)
          .set({ 
            status: 'active',
            updated_at: new Date(),
            validation_message: 'Compte validé avec succès'
          })
          .where(schema.postingAccounts.id.equals(account.id));
        
        if (resultsByPlatform[platform]) {
          resultsByPlatform[platform].valid++;
        }
      } else {
        logToFile(`Compte ${account.email} ÉCHOUÉ: ${authResult.reason}`);
        problematic++;
        
        if (authResult.reason?.includes('authentification')) {
          authFailed++;
        }
        
        // Mise à jour du statut
        await db.update(schema.postingAccounts)
          .set({ 
            status: 'problematic',
            updated_at: new Date(),
            validation_message: authResult.reason || 'Problème non spécifié'
          })
          .where(schema.postingAccounts.id.equals(account.id));
        
        if (resultsByPlatform[platform]) {
          resultsByPlatform[platform].invalid++;
        }
      }
    }
    
    // Fermer le navigateur
    await browser.close();
    
    // Statistiques finales
    logToFile('Vérification terminée. Statistiques finales:');
    logToFile(`Total des comptes vérifiés: ${accounts.length}`);
    logToFile(`Comptes valides: ${verified} (${Math.round(verified / accounts.length * 100)}%)`);
    logToFile(`Comptes problématiques: ${problematic} (${Math.round(problematic / accounts.length * 100)}%)`);
    logToFile(`Comptes trop récents: ${tooRecent} (${Math.round(tooRecent / accounts.length * 100)}%)`);
    logToFile(`Échecs d'authentification: ${authFailed} (${Math.round(authFailed / accounts.length * 100)}%)`);
    
    // Statistiques par plateforme
    for (const [platform, stats] of Object.entries(resultsByPlatform)) {
      if (stats.total > 0) {
        logToFile(`${platform}: ${stats.valid}/${stats.total} valides (${Math.round(stats.valid / stats.total * 100)}%)`);
      }
    }
    
    // Écrire un rapport détaillé
    const reportPath = path.join(__dirname, 'reports', 'account-validation.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalAccounts: accounts.length,
      validAccounts: verified,
      problematicAccounts: problematic,
      tooRecentAccounts: tooRecent,
      authenticationFailures: authFailed,
      platformStatistics: resultsByPlatform
    }, null, 2));
    
    logToFile(`Rapport détaillé écrit dans ${reportPath}`);
    
  } catch (error: any) {
    logToFile(`ERREUR: ${error.message}`);
    console.error(error);
  } finally {
    await client.end();
  }
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'verify-all':
      await verifyAllAccounts();
      break;
      
    case 'help':
    default:
      console.log(`
Usage: npm run account-validation [command]

Commands:
  verify-all  - Vérifier tous les comptes
  help        - Afficher cette aide
`);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { verifyAllAccounts };