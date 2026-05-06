/**
 * Version modifiée du test-batch.ts avec initialisation forcée de la base de données
 */
import * as fs from 'fs';
import * as path from 'path';
import { db, initializeDatabase, closeDatabase } from './server/db';
import { storage, initializeStorage } from './server/storage';
import { accountService } from './server/services/account.service';
import { proxyService } from './server/services/proxy.service';
import { encryptionService } from './server/services/encryption.service';
import { logger } from './server/services/logger.service';
import { captchaService } from './server/services/captcha.service';
import { AutomationService } from './server/services/automation.service';
import { Business, InsertBusiness, Review, InsertReview, PostingAccount } from './shared/schema';
import { userSecurityService } from './server/services/user-security.service';
import { AIService } from './server/services/ai.service';
import * as schema from './shared/schema';

// Configuration du test
const TEST_SIZE = 10; // Nombre de comptes et d'avis à tester
const PLATFORM = 'google'; // Plateforme à tester
const LOG_FILE = path.join(process.cwd(), 'test-batch-debug.log');
const SUMMARY_FILE = path.join(process.cwd(), 'test-batch-summary.json');
const CHECKPOINT_FILE = path.join(process.cwd(), 'test-batch-checkpoint.json');

// Point d'entrée du script modifié
async function runDebugTest() {
  console.log("=== Démarrage du test batch (10 comptes) ===");
  fs.writeFileSync(LOG_FILE, "=== Démarrage du test batch (10 comptes) ===\n", 'utf8');
  
  try {
    // **IMPORTANT**: Initialiser explicitement la base de données
    console.log("[2025-03-23] Initialisation de la base de données...");
    await initializeDatabase();
    console.log("[2025-03-23] Base de données initialisée");
    fs.appendFileSync(LOG_FILE, "[2025-03-23] Base de données initialisée\n", 'utf8');
    
    // **IMPORTANT**: Forcer l'initialisation du stockage
    console.log("[2025-03-23] Initialisation du stockage (PostgreSQL)...");
    await initializeStorage(true, true); // Force l'utilisation de PostgreSQL et réinitialise le stockage
    console.log("[2025-03-23] Stockage PostgreSQL initialisé");
    fs.appendFileSync(LOG_FILE, "[2025-03-23] Stockage PostgreSQL initialisé\n", 'utf8');
    
    // Vérification de la connexion: récupérer les proxies depuis la base de données
    console.log("[2025-03-23] Vérification des proxies disponibles...");
    fs.appendFileSync(LOG_FILE, "[2025-03-23] Vérification des proxies disponibles...\n", 'utf8');
    
    // Test 1: Requête directe via DB
    console.log("[2025-03-23] Test 1: Requête directe via DB");
    fs.appendFileSync(LOG_FILE, "[2025-03-23] Test 1: Requête directe via DB\n", 'utf8');
    const proxiesViaDB = await db.select().from(schema.proxies);
    console.log(`Nombre de proxies via DB: ${proxiesViaDB.length}`);
    fs.appendFileSync(LOG_FILE, `Nombre de proxies via DB: ${proxiesViaDB.length}\n`, 'utf8');
    console.log(`Proxies actifs via DB: ${proxiesViaDB.filter(p => p.status === 'active').length}`);
    fs.appendFileSync(LOG_FILE, `Proxies actifs via DB: ${proxiesViaDB.filter(p => p.status === 'active').length}\n`, 'utf8');
    
    // Test 2: Via Storage
    console.log("[2025-03-23] Test 2: Via Storage");
    fs.appendFileSync(LOG_FILE, "[2025-03-23] Test 2: Via Storage\n", 'utf8');
    const storageProxies = await storage.getProxies();
    console.log(`Nombre de proxies via storage: ${storageProxies.length}`);
    fs.appendFileSync(LOG_FILE, `Nombre de proxies via storage: ${storageProxies.length}\n`, 'utf8');
    console.log(`Proxies actifs via storage: ${storageProxies.filter(p => p.status === 'active').length}`);
    fs.appendFileSync(LOG_FILE, `Proxies actifs via storage: ${storageProxies.filter(p => p.status === 'active').length}\n`, 'utf8');
    
    // Test 3: Via ProxyService
    console.log("[2025-03-23] Test 3: Via ProxyService");
    fs.appendFileSync(LOG_FILE, "[2025-03-23] Test 3: Via ProxyService\n", 'utf8');
    const proxy = await proxyService.getAvailableProxy({
      operation: 'account_creation',
      critical: true,
      platform: 'google'
    });
    
    if (proxy) {
      console.log(`Proxy disponible trouvé: id=${proxy.id}, host=${proxy.host}, pays=${proxy.country}`);
      fs.appendFileSync(LOG_FILE, `Proxy disponible trouvé: id=${proxy.id}, host=${proxy.host}, pays=${proxy.country}\n`, 'utf8');
    } else {
      console.log("Aucun proxy disponible via proxyService.getAvailableProxy()");
      fs.appendFileSync(LOG_FILE, "Aucun proxy disponible via proxyService.getAvailableProxy()\n", 'utf8');
    }
    
    // Vérification terminée
    console.log("\n=== Vérification terminée ===");
    fs.appendFileSync(LOG_FILE, "\n=== Vérification terminée ===\n", 'utf8');
    
    // Fermer proprement la connexion
    await closeDatabase();
    
    return 0;
  } catch (error) {
    console.error("ERREUR:", error);
    fs.appendFileSync(LOG_FILE, `ERREUR: ${error instanceof Error ? error.message : String(error)}\n`, 'utf8');
    
    await closeDatabase();
    return 1;
  }
}

// Exécuter le test amélioré
runDebugTest()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error("Erreur critique:", error);
    process.exit(1);
  });
