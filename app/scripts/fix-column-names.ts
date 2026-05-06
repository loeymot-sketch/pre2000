/**
 * Script de correction des noms de colonnes
 * 
 * Ce script renomme toutes les colonnes de snake_case vers camelCase
 * pour standardiser la base de données.
 */

import { SimpleLogger } from './shared/utils/logger';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

const logger = new SimpleLogger('fix-column-names');

async function renameColumnIfExists(tableName: string, oldColumnName: string, newColumnName: string) {
  try {
    // Vérifier si la colonne existe
    const existsQuery = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = ${tableName} AND column_name = ${oldColumnName}
      )
    `);
    
    const exists = existsQuery.rows[0]?.exists;
    
    if (exists) {
      // Renommer la colonne
      await db.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)} 
        RENAME COLUMN ${sql.identifier(oldColumnName)} TO ${sql.identifier(newColumnName)}
      `);
      logger.info(`Colonne ${tableName}.${oldColumnName} renommée en ${newColumnName}`);
    } else {
      logger.info(`Colonne ${tableName}.${oldColumnName} n'existe pas, ignorée`);
    }
  } catch (error) {
    logger.error(`Erreur lors du renommage de ${tableName}.${oldColumnName}: ${error.message}`);
  }
}

async function fixColumnNames() {
  logger.info('Début de la correction des noms de colonnes...');
  
  // Liste des colonnes à renommer dans posting_accounts
  const postingAccountColumns = [
    { old: 'recovery_attempts', new: 'recoveryAttempts' },
    { old: 'last_recovery_attempt', new: 'lastRecoveryAttempt' },
    { old: 'last_recovery_message', new: 'lastRecoveryMessage' },
    { old: 'recovery_strategy_used', new: 'recoveryStrategyUsed' },
    { old: 'last_successful_login', new: 'lastSuccessfulLogin' },
    { old: 'priority_score', new: 'priorityScore' },
    { old: 'max_daily_uses', new: 'maxDailyUses' },
    { old: 'max_consecutive_uses', new: 'maxConsecutiveUses' },
    { old: 'fingerprint_variation', new: 'fingerprintVariation' },
    { old: 'user_agent_profile', new: 'userAgentProfile' },
    { old: 'session_lifetime', new: 'sessionLifetime' },
    { old: 'reputation_score', new: 'reputationScore' },
    { old: 'regional_specialization', new: 'regionalSpecialization' },
    { old: 'warmup_period_end', new: 'warmupPeriodEnd' },
    { old: 'last_warming', new: 'lastWarming' },
    { old: 'warming_sessions', new: 'warmingSessions' },
    { old: 'warming_success_count', new: 'warmingSuccessCount' },
    { old: 'session_success_rate', new: 'sessionSuccessRate' },
    { old: 'browsing_history', new: 'browsingHistory' },
    { old: 'humanity_score', new: 'humanityScore' },
    { old: 'last_visited_sites', new: 'lastVisitedSites' },
    { old: 'browser_fingerprint', new: 'browserFingerprint' },
    { old: 'risk_level', new: 'riskLevel' },
    { old: 'behavior_profile', new: 'behaviorProfile' },
    { old: 'last_behavior_simulation', new: 'lastBehaviorSimulation' },
    { old: 'preferred_language', new: 'preferredLanguage' },
    { old: 'consecutive_failures', new: 'consecutiveFailures' },
    { old: 'last_failed_platform', new: 'lastFailedPlatform' },
    { old: 'last_successful_platform', new: 'lastSuccessfulPlatform' },
    { old: 'verification_fail_count', new: 'verificationFailCount' },
    { old: 'resource_saving_mode', new: 'resourceSavingMode' },
    { old: 'account_age_days', new: 'accountAgeDays' },
    { old: 'warm_state', new: 'warmState' },
    { old: 'simulated_creation_date', new: 'simulatedCreationDate' },
    { old: 'activity_consistency_score', new: 'activityConsistencyScore' },
    { old: 'natural_growth_pattern', new: 'naturalGrowthPattern' },
    { old: 'captcha_encounters', new: 'captchaEncounters' },
    { old: 'suspicion_triggers', new: 'suspicionTriggers' },
    { old: 'last_suspicion_event', new: 'lastSuspicionEvent' },
    { old: 'has_recovery_email', new: 'hasRecoveryEmail' },
    { old: 'has_backup_phone', new: 'hasBackupPhone' },
    { old: 'recovery_strategy', new: 'recoveryStrategy' },
    { old: 'typing_speed_variation', new: 'typingSpeedVariation' },
    { old: 'mouse_movement_pattern', new: 'mouseMovementPattern' },
    { old: 'navigation_depth_avg', new: 'navigationDepthAvg' },
    { old: 'suspected_reuse_count', new: 'suspectedReuseCount' },
    { old: 'geomatch_success_count', new: 'geomatchSuccessCount' },
    { old: 'geomatch_failure_count', new: 'geomatchFailureCount' }
  ];
  
  // Colonnes à renommer dans proxies
  const proxyColumns = [
    { old: 'success_rate', new: 'successRate' },
    { old: 'reliability_score', new: 'reliabilityScore' },
    { old: 'specialized_for', new: 'specializedFor' },
    { old: 'last_checked', new: 'lastChecked' },
    { old: 'last_used', new: 'lastUsed' },
    { old: 'usage_count', new: 'usageCount' },
    { old: 'last_platform_success', new: 'lastPlatformSuccess' },
    { old: 'last_platform_failure', new: 'lastPlatformFailure' },
    { old: 'blacklisted_until', new: 'blacklistedUntil' }
  ];
  
  // Appliquer les renommages pour posting_accounts
  logger.info('Renommage des colonnes de la table posting_accounts...');
  for (const column of postingAccountColumns) {
    await renameColumnIfExists('posting_accounts', column.old, column.new);
  }
  
  // Appliquer les renommages pour proxies
  logger.info('Renommage des colonnes de la table proxies...');
  for (const column of proxyColumns) {
    await renameColumnIfExists('proxies', column.old, column.new);
  }
  
  logger.info('Correction des noms de colonnes terminée.');
}

// Exécuter le script
fixColumnNames().catch(error => {
  logger.error(`Erreur lors de l'exécution du script: ${error.message}`);
  process.exit(1);
});