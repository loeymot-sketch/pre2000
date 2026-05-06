/**
 * Script pour standardiser les noms de colonnes en camelCase
 */
import { db } from './server/db';
import * as schema from './shared/schema';
import { logger } from './server/services/logger.service';

async function main() {
  try {
    console.log('🔄 Mise à jour des référence vers les colonnes dans le code...');
    
    // Création d'un fichier SQL pour la migration
    const migrationSql = `
    -- Migration pour standardiser les noms de colonnes en camelCase
    
    -- Table posting_accounts
    ALTER TABLE IF EXISTS posting_accounts RENAME COLUMN is_flagged TO "isFlagged";
    
    -- Table proxies
    ALTER TABLE IF EXISTS proxies RENAME COLUMN consecutive_failures TO "consecutiveFailures";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN total_successes TO "totalSuccesses";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN total_failures TO "totalFailures";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN last_status_change TO "lastStatusChange";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN average_latency TO "averageLatency";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN usage_time_today TO "usageTimeToday";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN daily_usage_limit TO "dailyUsageLimit";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN cooldown_until TO "cooldownUntil";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN last_geomatch_score TO "lastGeomatchScore";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN geomatch_success_count TO "geomatchSuccessCount";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN geomatch_failure_count TO "geomatchFailureCount";
    ALTER TABLE IF EXISTS proxies RENAME COLUMN success_rate TO "successRate";
    
    -- Table reviews (vérification supplémentaire)
    ALTER TABLE IF EXISTS reviews RENAME COLUMN last_attempt TO "lastAttempt";
    ALTER TABLE IF EXISTS reviews RENAME COLUMN attempt_count TO "attemptCount";
    ALTER TABLE IF EXISTS reviews RENAME COLUMN posted_at TO "postedAt";
    `;
    
    console.log('📝 SQL de migration généré :', migrationSql);
    
    // Exécuter directement les migrations
    console.log('🔄 Exécution des migrations SQL...');
    
    // Ajouter les commandes SQL une par une
    const commands = migrationSql.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const cmd of commands) {
      try {
        await db.execute(cmd + ';');
        console.log(`✅ Commande exécutée avec succès: ${cmd.trim()}`);
      } catch (error) {
        console.log(`⚠️ Erreur lors de l'exécution de la commande: ${cmd.trim()}`);
        console.log(`   Message d'erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        // Continuer avec les autres commandes
      }
    }
    
    console.log('✅ Normalisation des noms de colonnes terminée!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la standardisation des noms de colonnes:', error);
    process.exit(1);
  }
}

main();
