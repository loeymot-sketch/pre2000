/**
 * Script pour corriger les avis bloqués en état "processing"
 * 
 * Ce script identifie et corrige les avis restés bloqués en état "processing",
 * ce qui peut arriver en cas d'erreur système ou d'interruption.
 */

import { db } from './server/db';
import * as schema from './shared/schema';
import { eq, and, or, lt, gt, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'fix-processing-reviews.log');

// Assurer que le répertoire de logs existe
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Fonction pour journaliser
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

async function fixProcessingReviews() {
  try {
    log('Démarrage de la correction des avis en "processing"...');

    // 1. Identifier les avis bloqués en processing
    const processingReviews = await db.select()
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.status, 'processing'),
          lt(schema.reviews.updatedAt || schema.reviews.createdAt, new Date(Date.now() - 30 * 60 * 1000)) // Bloqués depuis plus de 30 minutes
        )
      );

    if (processingReviews.length === 0) {
      log('Aucun avis bloqué en "processing" trouvé.');
      return { success: true, message: 'Aucun avis à corriger' };
    }

    log(`${processingReviews.length} avis bloqués en "processing" trouvés.`);

    // 2. Mettre à jour les avis pour nouvelle tentative
    const updateResult = await db.update(schema.reviews)
      .set({
        status: 'pending', 
        updatedAt: new Date(),
        error: sql`COALESCE(${schema.reviews.error}, '') || ' | Récupéré après blocage en processing'`
      })
      .where(
        and(
          eq(schema.reviews.status, 'processing'),
          lt(schema.reviews.updatedAt || schema.reviews.createdAt, new Date(Date.now() - 30 * 60 * 1000))
        )
      )
      .returning();

    log(`${updateResult.length} avis ont été réinitialisés à "pending" pour nouvelle tentative.`);

    // 3. Identifier les avis en 'retrying' depuis trop longtemps
    const stuckRetrying = await db.select()
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.status, 'retrying'),
          lt(schema.reviews.updatedAt || schema.reviews.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)), // Coincés depuis plus de 24h
          gt(schema.reviews.retryCount || 0, 5) // Plus de 5 tentatives
        )
      );

    if (stuckRetrying.length > 0) {
      log(`${stuckRetrying.length} avis bloqués en "retrying" avec trop de tentatives.`);
      
      // Marquer comme erreur permanente
      await db.update(schema.reviews)
        .set({
          status: 'error',
          updatedAt: new Date(),
          error: sql`COALESCE(${schema.reviews.error}, '') || ' | Échec après multiples tentatives'` 
        })
        .where(
          and(
            eq(schema.reviews.status, 'retrying'),
            lt(schema.reviews.updatedAt || schema.reviews.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
            gt(schema.reviews.retryCount || 0, 5)
          )
        );
      
      log(`${stuckRetrying.length} avis mis en "error" après trop de tentatives.`);
    }

    return { 
      success: true, 
      fixed: updateResult.length,
      markedError: stuckRetrying.length
    };
  } catch (error) {
    log(`ERREUR: ${error}`);
    return { success: false, error };
  }
}

// Exécution principale
async function main() {
  try {
    const result = await fixProcessingReviews();
    log(`Opération terminée: ${JSON.stringify(result)}`);
    process.exit(0);
  } catch (error) {
    log(`Erreur fatale: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { fixProcessingReviews };