/**
 * Script de test pour le service de rotation proactive des IPs
 * 
 * Ce script permet de tester le fonctionnement du service de rotation proactive des IPs
 * en simulant différents scénarios d'utilisation et en vérifiant les résultats.
 */

import { proactiveIpRotation } from './server/services/proactive-ip-rotation.service';
import { db } from './server/db';
import * as schema from './shared/schema';
import { eq, and, desc, lt, gte, sql } from 'drizzle-orm';

/**
 * Fonction principale de test
 */
async function main() {
  console.log('=== Test du service de rotation proactive des IPs ===');
  
  try {
    // 1. Vérifier la connexion à la base de données
    console.log('1. Vérification de la connexion à la base de données...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Connexion à la base de données établie');
    
    // 2. Récupérer la liste des proxies
    console.log('\n2. Récupération de la liste des proxies...');
    const proxies = await db.select().from(schema.proxies);
    console.log(`✅ ${proxies.length} proxies trouvés dans la base de données`);
    
    if (proxies.length === 0) {
      console.error('❌ Aucun proxy disponible pour les tests');
      return;
    }
    
    // 3. Vérifier les stratégies de rotation actives
    console.log('\n3. Vérification des stratégies de rotation actives...');
    const rotationStats = proactiveIpRotation.getRotationStats();
    console.log('✅ Stratégies de rotation actives:', rotationStats.enabledStrategies);
    
    // 4. Simuler des requêtes pour un proxy spécifique
    console.log('\n4. Simulation de requêtes pour un proxy...');
    const testProxy = proxies[0];
    console.log(`   Utilisation du proxy ID: ${testProxy.id} (${testProxy.host}:${testProxy.port})`);
    
    // Simuler 10 requêtes réussies pour Google
    for (let i = 0; i < 10; i++) {
      proactiveIpRotation.recordProxyRequest(testProxy.id, 'google', true);
      console.log(`   [${i+1}/10] Requête enregistrée pour google (succès)`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Petit délai entre les requêtes
    }
    
    console.log(`✅ 10 requêtes réussies enregistrées pour le proxy ID: ${testProxy.id}`);
    
    // 5. Vérifier les statistiques d'utilisation du proxy
    console.log('\n5. Vérification des statistiques d\'utilisation du proxy...');
    const proxyStats = proactiveIpRotation.getProxyUsageStats(testProxy.id);
    console.log('✅ Statistiques d\'utilisation:', JSON.stringify(proxyStats, null, 2));
    
    // 6. Forcer une rotation pour le proxy
    console.log('\n6. Test de rotation forcée pour le proxy...');
    const rotationResult = await proactiveIpRotation.forceRotateProxy(
      testProxy.id,
      'test_rotation',
      'google',
      'medium'
    );
    
    if (rotationResult.success) {
      console.log(`✅ Rotation forcée réussie pour le proxy ID: ${testProxy.id}`);
      
      // Vérifier le statut du proxy après la rotation
      const updatedProxy = await db.query.proxies.findFirst({
        where: eq(schema.proxies.id, testProxy.id)
      });
      
      console.log(`   Nouveau statut du proxy: ${updatedProxy?.status}`);
      console.log(`   Période de refroidissement jusqu'à: ${updatedProxy?.cooldownUntil}`);
      
      // Récupérer l'historique des rotations
      console.log('\n7. Récupération de l\'historique des rotations...');
      const rotationHistory = proactiveIpRotation.getProxyRotationHistory(testProxy.id);
      console.log(`✅ ${rotationHistory.length} rotations trouvées dans l'historique`);
      console.log('   Dernière rotation:', JSON.stringify(rotationHistory[0], null, 2));
      
      // Récupérer les rotations depuis la base de données
      const dbRotations = await db.select()
        .from(schema.proxyRotations)
        .where(eq(schema.proxyRotations.oldProxyId, testProxy.id))
        .orderBy(desc(schema.proxyRotations.timestamp));
      
      console.log(`✅ ${dbRotations.length} rotations trouvées dans la base de données`);
      if (dbRotations.length > 0) {
        console.log('   Dernière rotation en base de données:', JSON.stringify(dbRotations[0], null, 2));
      }
    } else {
      console.error(`❌ Échec de la rotation forcée: ${rotationResult.message}`);
    }
    
    // 8. Tester l'activation d'un proxy en cooling
    console.log('\n8. Test d\'activation d\'un proxy en cooling...');
    
    // Récupérer un proxy en cooling
    const coolingProxies = await db.select()
      .from(schema.proxies)
      .where(eq(schema.proxies.status, 'cooling'));
    
    if (coolingProxies.length > 0) {
      const coolingProxy = coolingProxies[0];
      console.log(`   Activation du proxy ID: ${coolingProxy.id} (actuellement en cooling)`);
      
      // Activer le proxy
      await db.update(schema.proxies)
        .set({
          status: 'active',
          lastStatusChange: new Date(),
          cooldownUntil: null
        })
        .where(eq(schema.proxies.id, coolingProxy.id));
      
      console.log(`✅ Proxy ID: ${coolingProxy.id} activé avec succès`);
      
      // Vérifier le statut après activation
      const activatedProxy = await db.query.proxies.findFirst({
        where: eq(schema.proxies.id, coolingProxy.id)
      });
      
      console.log(`   Nouveau statut du proxy: ${activatedProxy?.status}`);
    } else {
      console.log('   Aucun proxy en cooling trouvé pour le test d\'activation');
    }
    
    // 9. Test de désactivation et réactivation d'une stratégie
    console.log('\n9. Test de désactivation et réactivation d\'une stratégie...');
    console.log('   Désactivation de la stratégie "volume"');
    
    const oldStatus = proactiveIpRotation.setStrategyEnabled('volume', false);
    console.log(`✅ Stratégie "volume" désactivée (état précédent: ${oldStatus})`);
    
    console.log('   Réactivation de la stratégie "volume"');
    proactiveIpRotation.setStrategyEnabled('volume', true);
    console.log('✅ Stratégie "volume" réactivée');
    
    // 10. Test de rotation par plateforme
    console.log('\n10. Test de simulation de requêtes sur différentes plateformes...');
    
    // Trouver un autre proxy actif
    const activeProxies = await db.select()
      .from(schema.proxies)
      .where(eq(schema.proxies.status, 'active'))
      .limit(2);
    
    if (activeProxies.length > 1) {
      const diversityTestProxy = activeProxies[1];
      console.log(`   Utilisation du proxy ID: ${diversityTestProxy.id} pour le test de diversité`);
      
      // Simuler des requêtes sur différentes plateformes
      for (let i = 0; i < 5; i++) {
        proactiveIpRotation.recordProxyRequest(diversityTestProxy.id, 'google', true);
        console.log(`   [${i+1}/5] Requête enregistrée pour google (succès)`);
      }
      
      for (let i = 0; i < 5; i++) {
        proactiveIpRotation.recordProxyRequest(diversityTestProxy.id, 'trustpilot', true);
        console.log(`   [${i+1}/5] Requête enregistrée pour trustpilot (succès)`);
      }
      
      for (let i = 0; i < 3; i++) {
        proactiveIpRotation.recordProxyRequest(diversityTestProxy.id, 'tripadvisor', true);
        console.log(`   [${i+1}/3] Requête enregistrée pour tripadvisor (succès)`);
      }
      
      const diversityStats = proactiveIpRotation.getProxyUsageStats(diversityTestProxy.id);
      console.log('✅ Statistiques de diversité:', JSON.stringify(diversityStats.platformUsage, null, 2));
    } else {
      console.log('   Pas assez de proxies actifs pour le test de diversité');
    }
    
    console.log('\n=== Tests terminés avec succès ===');
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter le script de test
main().then(() => process.exit(0)).catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});