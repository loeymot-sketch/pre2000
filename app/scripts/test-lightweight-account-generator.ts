/**
 * Script ultra-léger de génération de comptes simulés pour ReviewFlow Automator
 * 
 * Cette version simplifiée minimise toutes les attentes et opérations intensives
 * pour permettre de tester rapidement le flux complet avec un minimum de ressources.
 */

import { faker } from '@faker-js/faker';
import { db } from './server/db';
import { postingAccounts, proxies } from './shared/schema';
import { encryptionService } from './server/services/encryption.service';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

// Configuration minimaliste
const CONFIG = {
  PLATFORM: 'trustpilot', // Plateforme par défaut
  COUNT: 5,               // Nombre de comptes à créer
  DELAY: 500,             // Délai minimal entre les opérations (500ms)
  LOG_FILE: './temp/account-generation-log.txt'
};

/**
 * Fonction principale pour générer des comptes de test
 */
async function generateTestAccounts(platform = CONFIG.PLATFORM, count = CONFIG.COUNT) {
  console.log(`🚀 Démarrage de la génération rapide de ${count} comptes ${platform}...`);
  
  // Créer le répertoire temp si nécessaire
  fs.mkdirSync('./temp', { recursive: true });
  
  // Récupérer des proxies actifs
  console.log(`🔍 Récupération des proxies...`);
  const proxyResults = await db.select().from(proxies).where(eq(proxies.status, 'active'));
  
  if (proxyResults.length === 0) {
    console.error('❌ Aucun proxy actif disponible dans la base de données');
    return { success: false, created: 0, message: 'Aucun proxy disponible' };
  }
  
  console.log(`✅ ${proxyResults.length} proxies trouvés`);
  
  // Journal pour suivre les comptes créés
  let log = `=== GÉNÉRATION DE COMPTES ${platform.toUpperCase()} - ${new Date().toISOString()} ===\n\n`;
  const logPath = CONFIG.LOG_FILE;
  
  const results = {
    success: true,
    total: count,
    created: 0,
    failed: 0,
    accounts: [] as Array<{email: string, password: string, success: boolean}>
  };
  
  // Boucle de création des comptes
  for (let i = 0; i < count; i++) {
    try {
      console.log(`\n[${i+1}/${count}] Création de compte...`);
      
      // Générer un profil aléatoire
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName }).toLowerCase();
      const password = `${faker.word.adjective()}${faker.number.int({ min: 100, max: 999 })}${faker.word.noun()}!`;
      
      // Sélectionner un proxy aléatoire
      const proxy = proxyResults[Math.floor(Math.random() * proxyResults.length)];
      console.log(`📡 Proxy: ID ${proxy.id} (${proxy.host}:${proxy.port})`);
      
      // Simuler une création réussie
      console.log(`👤 Profil: ${firstName} ${lastName} (${email})`);
      
      // Mini-délai pour éviter les surcharges
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY));
      
      // Stocker le compte en base de données
      console.log(`💾 Enregistrement dans la base de données...`);
      
      // Chiffrer le mot de passe
      const encryptedPassword = await encryptionService.encryptForStorage(password);
      
      // Insertion simplifiée avec uniquement les champs obligatoires
      await db.insert(postingAccounts).values({
        platform: platform,
        email: email,
        password: encryptedPassword,
        status: 'active',
        creationIp: proxy.host,
        proxyId: proxy.id,
        accountConfidenceScore: 80,
        accountTier: 'standard',
        activityPattern: 'medium',
        priorityScore: 50,
        maxDailyUses: 2,
        maxConsecutiveUses: 2,
        reputationScore: 70,
        humanityScore: 80
      });
      
      console.log(`✅ Compte créé: ${email}`);
      
      // Ajouter à nos résultats
      results.accounts.push({
        email,
        password,
        success: true
      });
      
      results.created++;
      
      // Ajouter au log
      log += `${i+1}. ✅ ${email} | ${password} | Proxy ID: ${proxy.id}\n`;
      
    } catch (error: any) {
      console.error(`❌ Erreur: ${error.message}`);
      results.failed++;
      log += `${i+1}. ❌ Erreur: ${error.message}\n`;
    }
  }
  
  // Ajouter un résumé au log
  log += `\n=== RÉSUMÉ ===\n`;
  log += `Total demandé: ${count}\n`;
  log += `Créés avec succès: ${results.created}\n`;
  log += `Échecs: ${results.failed}\n`;
  log += `Date de fin: ${new Date().toISOString()}\n`;
  
  // Sauvegarder le log
  fs.writeFileSync(logPath, log);
  console.log(`📄 Log sauvegardé dans ${logPath}`);
  
  // Sauvegarder les comptes séparément pour un accès facile
  const accountsPath = `./temp/${platform}-accounts-${Date.now()}.json`;
  fs.writeFileSync(accountsPath, JSON.stringify(results.accounts, null, 2));
  console.log(`📄 Comptes sauvegardés dans ${accountsPath}`);
  
  // Afficher un résumé
  console.log(`\n=== GÉNÉRATION TERMINÉE ===`);
  console.log(`✅ Comptes créés: ${results.created}/${count}`);
  console.log(`❌ Échecs: ${results.failed}`);
  
  return results;
}

// Fonction principale
async function main() {
  try {
    // Récupérer les arguments de ligne de commande
    const args = process.argv.slice(2);
    const platform = args[0] || CONFIG.PLATFORM;
    const count = args[1] ? parseInt(args[1]) : CONFIG.COUNT;
    
    if (count !== undefined && isNaN(count)) {
      console.error('❌ Le nombre de comptes doit être un nombre valide');
      process.exit(1);
    }
    
    console.log(`🔄 Démarrage du générateur ultra-léger pour ${count} comptes ${platform}`);
    
    // Lancer la génération
    await generateTestAccounts(platform, count);
    
    console.log('✅ Terminé!');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});