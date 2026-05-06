/**
 * Test de publication d'avis avec correspondance géographique stricte
 * Utilise le nouveau système de cohérence géographique entre comptes et proxies
 */

import { db } from './server/db';
import fs from 'fs';
import { EnhancedRealPostingService } from './server/services/enhanced-real-posting.service';
import { ProxyService } from './server/services/proxy.service';

const LOG_FILE = 'geo-consistent-review-test.log';

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error: any) {
    console.error(`Erreur d'écriture dans le fichier de log: ${error.message}`);
  }
}

interface ReviewTaskParams {
  platform: string;
  content: string;
  rating: number;
  businessId: number;
  country: string;
}

/**
 * Sélectionne un compte géographiquement cohérent pour la publication
 */
async function selectGeoConsistentAccount(platform: string, country: string) {
  try {
    const query = `
      SELECT pa.id, pa.platform, pa.country, pa.region, pa.city, pa."proxyId", pa.dedicatedproxyid,
        p.country as proxy_country
      FROM posting_accounts pa
      JOIN proxies p ON (pa.dedicatedproxyid = p.id OR pa."proxyId" = p.id)
      WHERE pa.platform = '${platform}'
      AND pa.country = '${country}'
      AND pa.strictgeomode = true
      AND pa.status = 'active'
      AND p.country = '${country}'
      LIMIT 1
    `;
    
    const result = await db.execute(query);
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    } else if (result.rows && Array.isArray(result.rows) && result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    log(`❌ Erreur lors de la sélection du compte: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Sélectionne un business pour le test
 */
async function selectTestBusiness(platform: string) {
  try {
    const query = `
      SELECT id, name, type, country, city, region
      FROM businesses
      WHERE platform = '${platform}' OR platform IS NULL
      LIMIT 1
    `;
    
    const result = await db.execute(query);
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    } else if (result.rows && Array.isArray(result.rows) && result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    log(`❌ Erreur lors de la sélection du business: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Génère un contenu d'avis aléatoire basé sur le pays
 */
function generateReviewContent(country: string): string {
  const reviewsByCountry: Record<string, string[]> = {
    'FR': [
      "Excellent service, je recommande vivement cette entreprise.",
      "Très satisfait de ma visite, le personnel était attentionné.",
      "Qualité au rendez-vous, je n'hésiterai pas à revenir.",
      "Une expérience client remarquable, merci pour votre professionnalisme."
    ],
    'UK': [
      "Great service, highly recommend this business.",
      "Very satisfied with my visit, the staff was attentive.",
      "Quality was on point, I will not hesitate to come back.",
      "A remarkable customer experience, thank you for your professionalism."
    ],
    'DE': [
      "Ausgezeichneter Service, ich empfehle dieses Unternehmen wärmstens.",
      "Sehr zufrieden mit meinem Besuch, das Personal war aufmerksam.",
      "Qualität wie versprochen, ich werde ohne Zögern wiederkommen.",
      "Eine bemerkenswerte Kundenerfahrung, danke für Ihre Professionalität."
    ]
  };
  
  const reviews = reviewsByCountry[country] || reviewsByCountry['UK'];
  return reviews[Math.floor(Math.random() * reviews.length)];
}

/**
 * Fonction principale pour exécuter le test
 */
async function runGeographicalReviewTest() {
  log("Démarrage du test de publication d'avis avec cohérence géographique");
  
  try {
    // Pays de test (choisir parmi FR, UK, DE)
    const testCountry = 'FR';
    const testPlatform = 'google';
    
    log(`Pays de test: ${testCountry}, Plateforme: ${testPlatform}`);
    
    // Sélectionner un compte cohérent géographiquement
    const account = await selectGeoConsistentAccount(testPlatform, testCountry);
    if (!account) {
      log(`❌ Aucun compte ${testPlatform} trouvé pour le pays ${testCountry} avec correspondance géographique`);
      return;
    }
    
    log(`✅ Compte sélectionné: ${account.id} (${account.platform} - ${account.country})`);
    log(`   Région: ${account.region}, Ville: ${account.city}`);
    log(`   ProxyId: ${account.proxyId}, DedicatedProxyId: ${account.dedicatedproxyid}`);
    log(`   Pays du proxy: ${account.proxy_country}`);
    
    // Sélectionner un business de test
    const business = await selectTestBusiness(testPlatform);
    if (!business) {
      log(`❌ Aucun business trouvé pour la plateforme ${testPlatform}`);
      return;
    }
    
    log(`✅ Business sélectionné: ${business.id} (${business.name})`);
    
    // Générer un contenu d'avis adapté au pays
    const reviewContent = generateReviewContent(testCountry);
    const rating = 5; // Note maximale
    
    log(`Contenu de l'avis: "${reviewContent}"`);
    
    // Configuration du service de proxy
    const proxyService = new ProxyService(db);
    
    // Configuration du service de publication
    const postingService = new EnhancedRealPostingService(db, proxyService);
    
    // Configurer la tâche de publication
    const reviewTask: ReviewTaskParams = {
      platform: testPlatform,
      content: reviewContent,
      rating: rating,
      businessId: business.id,
      country: testCountry
    };
    
    log('Lancement de la publication de l'avis...');
    
    // Exécuter la publication avec le compte sélectionné
    const result = await postingService.postReview({
      platform: reviewTask.platform,
      content: reviewTask.content,
      rating: reviewTask.rating,
      businessId: reviewTask.businessId,
      accountId: account.id,
      strictGeoMode: true
    });
    
    if (result.success) {
      log(`✅ Publication réussie! ID de l'avis: ${result.reviewId}`);
      log(`   Détails: ${result.message}`);
    } else {
      log(`❌ Échec de la publication: ${result.message}`);
      if (result.error) {
        log(`   Erreur détaillée: ${result.error}`);
      }
    }
  } catch (error) {
    log(`❌ Erreur globale lors du test: ${error.message}`);
    console.error(error);
  }
}

// Exécution du test
runGeographicalReviewTest()
  .catch(error => {
    log(`Erreur non gérée: ${error.message}`);
    console.error(error);
  })
  .finally(() => {
    log('Test terminé');
    process.exit(0);
  });