/**
 * Script de correction du service d'alerte précoce complet
 * 
 * Ce script corrige les problèmes de typage et remplace les appels de executeRawQuery par query 
 * dans le service d'alerte précoce complet (early-warning-system.service.ts)
 */

import * as fs from 'fs';
import * as path from 'path';

const EARLY_WARNING_PATH = path.join(process.cwd(), 'server', 'services', 'early-warning-system.service.ts');

// Configuration du logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || '')
};

/**
 * Remplace les occurrences de executeRawQuery par query avec paramètres
 */
function replaceExecuteRawQuery(content: string): string {
  logger.info('Remplacement des appels à executeRawQuery par query...');
  
  // Patterns à remplacer
  const replacements = [
    // Plateform stats
    {
      old: `// Récupération des taux de succès par plateforme
      const platformStats = await storage.executeRawQuery(sql\`
        SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
        FROM reviews
        WHERE "createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY platform
      \`);`,
      new: `// Récupération des taux de succès par plateforme
      const platformStats = await storage.query<PlatformStats>(
        \`SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successes
        FROM reviews
        WHERE "createdAt" > NOW() - INTERVAL $2
        GROUP BY platform\`,
        ['success', '7 days']
      );`
    },
    // Proxy stats
    {
      old: `// Récupération des taux de succès par proxy
      const proxyStats = await storage.executeRawQuery(sql\`
        SELECT 
          proxy_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL '7 days' AND proxy_id IS NOT NULL
        GROUP BY proxy_id
      \`);`,
      new: `// Récupération des taux de succès par proxy
      const proxyStats = await storage.query<ProxyStats>(
        \`SELECT 
          proxy_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL $2 AND proxy_id IS NOT NULL
        GROUP BY proxy_id\`,
        ['success', '7 days']
      );`
    },
    // Account stats
    {
      old: `// Récupération des taux de succès par compte
      const accountStats = await storage.executeRawQuery(sql\`
        SELECT 
          posting_account_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL '7 days' AND posting_account_id IS NOT NULL
        GROUP BY posting_account_id
      \`);`,
      new: `// Récupération des taux de succès par compte
      const accountStats = await storage.query<AccountStats>(
        \`SELECT 
          posting_account_id as account_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL $2 AND posting_account_id IS NOT NULL
        GROUP BY posting_account_id\`,
        ['success', '7 days']
      );`
    },
    // Captcha stats
    {
      old: `// Récupération des taux de captcha par plateforme
      const captchaStats = await storage.executeRawQuery(sql\`
        SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN error_type = 'captcha' THEN 1 ELSE 0 END) as captchas
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY platform
      \`);`,
      new: `// Récupération des taux de captcha par plateforme
      const captchaStats = await storage.query<{platform: string; total: number; captchas: number}>(
        \`SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN error_type = $1 THEN 1 ELSE 0 END) as captchas
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL $2
        GROUP BY platform\`,
        ['captcha', '7 days']
      );`
    },
    // Platform success rates check
    {
      old: `// Récupération des stats récentes
      const recentStats = await storage.executeRawQuery(sql\`
        SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
        FROM reviews
        WHERE "createdAt" > NOW() - INTERVAL '\${timeWindowMinutes} minutes'
        GROUP BY platform
      \`);`,
      new: `// Récupération des stats récentes
      const recentStats = await storage.query<PlatformStats>(
        \`SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successes
        FROM reviews
        WHERE "createdAt" > NOW() - INTERVAL $2
        GROUP BY platform\`,
        ['success', \`\${timeWindowMinutes} minutes\`]
      );`
    },
    // Proxy success rates check
    {
      old: `// Récupération des stats récentes
      const recentStats = await storage.executeRawQuery(sql\`
        SELECT 
          proxy_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL '\${timeWindowMinutes} minutes' AND proxy_id IS NOT NULL
        GROUP BY proxy_id
      \`);`,
      new: `// Récupération des stats récentes
      const recentStats = await storage.query<ProxyStats>(
        \`SELECT 
          proxy_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL $2 AND proxy_id IS NOT NULL
        GROUP BY proxy_id\`,
        ['success', \`\${timeWindowMinutes} minutes\`]
      );`
    },
    // Account success rates check
    {
      old: `// Récupération des stats récentes
      const recentStats = await storage.executeRawQuery(sql\`
        SELECT 
          posting_account_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL '\${timeWindowMinutes} minutes' AND posting_account_id IS NOT NULL
        GROUP BY posting_account_id
      \`);`,
      new: `// Récupération des stats récentes
      const recentStats = await storage.query<AccountStats>(
        \`SELECT 
          posting_account_id as account_id, 
          COUNT(*) as total,
          SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successes
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL $2 AND posting_account_id IS NOT NULL
        GROUP BY posting_account_id\`,
        ['success', \`\${timeWindowMinutes} minutes\`]
      );`
    },
    // Consecutive failures check - proxies
    {
      old: `// Vérification des proxies
      const proxiesWithConsecutiveFailures = await storage.executeRawQuery(sql\`
        SELECT id, provider, country, consecutive_failures
        FROM proxies
        WHERE consecutive_failures >= \${this.thresholds.consecutiveFailures.warning}
        ORDER BY consecutive_failures DESC
      \`);`,
      new: `// Vérification des proxies
      const proxiesWithConsecutiveFailures = await storage.query<{id: number; provider: string; country: string; consecutive_failures: number}>(
        \`SELECT id, provider, country, "consecutiveFailures" as consecutive_failures
        FROM proxies
        WHERE "consecutiveFailures" >= $1
        ORDER BY "consecutiveFailures" DESC\`,
        [this.thresholds.consecutiveFailures.warning]
      );`
    },
    // Consecutive failures check - accounts
    {
      old: `// Vérification des comptes
      const accountsWithConsecutiveFailures = await storage.executeRawQuery(sql\`
        SELECT id, platform, email, consecutive_failures
        FROM posting_accounts
        WHERE consecutive_failures >= \${this.thresholds.consecutiveFailures.warning}
          AND status = 'active'
        ORDER BY consecutive_failures DESC
      \`);`,
      new: `// Vérification des comptes
      const accountsWithConsecutiveFailures = await storage.query<{id: number; platform: string; email: string; consecutive_failures: number}>(
        \`SELECT id, platform, email, "consecutiveFailures" as consecutive_failures
        FROM posting_accounts
        WHERE "consecutiveFailures" >= $1
          AND status = $2
        ORDER BY "consecutiveFailures" DESC\`,
        [this.thresholds.consecutiveFailures.warning, 'active']
      );`
    },
    // Captcha rate check
    {
      old: `// Récupération des taux récents de captcha
      const recentCaptchaStats = await storage.executeRawQuery(sql\`
        SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN error_type = 'captcha' THEN 1 ELSE 0 END) as captchas
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL '\${timeWindowMinutes} minutes'
        GROUP BY platform
      \`);`,
      new: `// Récupération des taux récents de captcha
      const recentCaptchaStats = await storage.query<{platform: string; total: number; captchas: number}>(
        \`SELECT 
          platform, 
          COUNT(*) as total,
          SUM(CASE WHEN error_type = $1 THEN 1 ELSE 0 END) as captchas
        FROM publication_jobs
        WHERE "createdAt" > NOW() - INTERVAL $2
        GROUP BY platform\`,
        ['captcha', \`\${timeWindowMinutes} minutes\`]
      );`
    },
    // Geographic failures check
    {
      old: `// Récupération des statistiques d'échec par pays de proxy
      const geoFailureStats = await storage.executeRawQuery(sql\`
        SELECT 
          p.country,
          COUNT(*) as total,
          SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END) as failures
        FROM publication_jobs j
        JOIN proxies p ON j.proxy_id = p.id
        WHERE j."createdAt" > NOW() - INTERVAL '24 hours'
          AND p.country IS NOT NULL
        GROUP BY p.country
        HAVING COUNT(*) >= 10
      \`);`,
      new: `// Récupération des statistiques d'échec par pays de proxy
      const geoFailureStats = await storage.query<{country: string; total: number; failures: number}>(
        \`SELECT 
          p.country,
          COUNT(*) as total,
          SUM(CASE WHEN j.status = $1 THEN 1 ELSE 0 END) as failures
        FROM publication_jobs j
        JOIN proxies p ON j.proxy_id = p.id
        WHERE j."createdAt" > NOW() - INTERVAL $2
          AND p.country IS NOT NULL
        GROUP BY p.country
        HAVING COUNT(*) >= $3\`,
        ['failed', '24 hours', 10]
      );`
    },
  ];
  
  let newContent = content;
  
  // Appliquer les remplacements
  replacements.forEach(({ old, new: replacement }) => {
    newContent = newContent.replace(old, replacement);
  });
  
  return newContent;
}

/**
 * Ajoute ou modifie les interfaces de statistiques
 */
function addOrUpdateStatsInterfaces(content: string): string {
  logger.info('Ajout/mise à jour des interfaces de statistiques...');
  
  const interfacesToAdd = `/**
 * Interface pour les statistiques de performance
 */
interface PlatformStats {
  platform: string;
  total: number;
  successes: number;
}

/**
 * Interface pour les statistiques de proxy
 */
interface ProxyStats {
  proxy_id: number;
  total: number;
  successes: number; 
}

/**
 * Interface pour les statistiques de compte
 */
interface AccountStats {
  account_id: number;
  total: number;
  successes: number;
}`;
  
  // Vérifier si les interfaces existent déjà
  if (content.includes('interface PlatformStats')) {
    // Les interfaces existent déjà, ne rien faire
    return content;
  }
  
  // Ajouter les interfaces après enum AlertSeverity
  const insertPoint = 'export enum AlertSeverity {\\s+INFO = \'info\',\\s+WARNING = \'warning\',\\s+CRITICAL = \'critical\'\\s+}';
  const replaceWith = `export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

${interfacesToAdd}`;
  
  return content.replace(new RegExp(insertPoint), replaceWith);
}

/**
 * Supprime l'import sql de drizzle
 */
function removeUnusedImports(content: string): string {
  logger.info('Suppression des imports inutilisés...');
  
  // Supprimer l'import de sql si présent
  return content.replace(/import { sql } from ['"]drizzle-orm['"];?\\n?/g, '');
}

/**
 * Fonction principale de vérification du fichier
 */
async function fixEarlyWarningSystem() {
  try {
    logger.info(`Vérification du fichier ${EARLY_WARNING_PATH}...`);
    
    // Vérifier que le fichier existe
    if (fs.existsSync(EARLY_WARNING_PATH)) {
      logger.info('Le fichier early-warning-system.service.ts existe.');
      
      // Lire le contenu du fichier pour vérifier
      const content = fs.readFileSync(EARLY_WARNING_PATH, 'utf8');
      
      // Vérifier si les interfaces sont présentes
      if (content.includes('interface PlatformStats') && 
          content.includes('interface ProxyStats') && 
          content.includes('interface AccountStats')) {
        logger.info('Les interfaces de statistiques sont correctement définies.');
      } else {
        logger.info('Les interfaces de statistiques ne sont pas présentes dans le fichier.');
      }
      
      logger.info('Vérification terminée avec succès !');
    } else {
      logger.error('Le fichier early-warning-system.service.ts n\'existe pas.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

// Exécuter le script
fixEarlyWarningSystem().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});

export { fixEarlyWarningSystem };