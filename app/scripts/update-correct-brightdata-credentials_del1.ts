/**
 * Script pour mettre à jour les identifiants BrightData avec les valeurs exactes 
 * de la capture d'écran fournie
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { proxies, ProxyType } from './shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from './server/services/logger.service';

// Format exact BrightData
const CORRECT_USERNAME = "brd-customer-hl_ab176a27-zone-residential_proxy1";
const CORRECT_PASSWORD = "y7z8all1x1u7";

/**
 * Met à jour tous les proxy BrightData avec les identifiants corrects
 */
async function updateBrightDataCredentials() {
  console.log("Démarrage de la mise à jour des identifiants BrightData...");
  
  // Connexion à la base de données
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  
  try {
    // 1. Récupérer tous les proxies BrightData
    const allProxies = await db.select().from(proxies);
    const brightDataProxies = allProxies.filter(proxy => 
      proxy.host?.includes('brd.superproxy.io') || 
      proxy.provider === 'brightdata'
    );
    
    console.log(`${brightDataProxies.length} proxies BrightData trouvés dans la base de données.`);
    
    // 2. Mettre à jour chaque proxy avec les identifiants corrects
    let updatedCount = 0;
    
    for (const proxy of brightDataProxies) {
      console.log(`Mise à jour du proxy ID ${proxy.id}...`);
      
      await db.update(proxies)
        .set({ 
          username: CORRECT_USERNAME,
          password: CORRECT_PASSWORD,
          provider: 'brightdata'
        })
        .where(eq(proxies.id, proxy.id));
      
      updatedCount++;
    }
    
    // 3. Si aucun proxy trouvé, en créer un par défaut
    if (brightDataProxies.length === 0) {
      console.log("Aucun proxy BrightData trouvé, création d'un proxy par défaut...");
      
      await db.insert(proxies).values({
        host: "brd.superproxy.io",
        port: 33335,
        username: CORRECT_USERNAME,
        password: CORRECT_PASSWORD,
        provider: "brightdata",
        type: "residential",
        country: "FR",
        success_rate: 95,
        last_tested: new Date(),
        is_active: true,
        options: {
          session_sticky: true,
          google_kyc: true,
          google_optimize: true
        }
      });
      
      updatedCount = 1;
    }
    
    console.log(`Mise à jour terminée. ${updatedCount} proxies mis à jour.`);
    
    // 4. Vérifier si la mise à jour est correcte
    const verifiedProxies = await db.select().from(proxies)
      .where(eq(proxies.username, CORRECT_USERNAME));
    
    console.log(`Vérification : ${verifiedProxies.length} proxies avec les identifiants corrects.`);
    
    return {
      success: true,
      updatedCount,
      verifiedCount: verifiedProxies.length
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour des identifiants:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

// Exécuter la fonction principale
updateBrightDataCredentials()
  .then(result => {
    console.log("Résultat:", result);
    process.exit(0);
  })
  .catch(err => {
    console.error("Erreur non gérée:", err);
    process.exit(1);
  });