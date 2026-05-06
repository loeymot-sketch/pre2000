/**
 * Test amélioré pour la publication d'un avis avec la nouvelle détection robuste des champs
 * 
 * Ce script teste notre implémentation améliorée de la détection des champs de connexion
 * Google qui était la cause de l'erreur "Impossible de trouver le champ email".
 */

import { db } from './server/db';
// Importation directe pour éviter les problèmes d'alias de chemin
import { reviews } from './shared/schema';
type Review = typeof reviews.$inferSelect;
import { storage } from './server/storage';
import { logger } from './server/services/logger.service';
import { AutomationService } from './server/services/automation.service';
import { accountRotationService } from './server/services/account-rotation.service';

// Initialiser l'AutomationService
const automationService = new AutomationService();

async function testImprovedReview() {
  console.log("🚀 TEST DE PUBLICATION D'AVIS AVEC DÉTECTION AMÉLIORÉE DES CHAMPS");
  
  try {
    console.log("\n🔍 Vérification des avis existants échoués...");
    
    // Récupérer tous les avis
    const allReviews = await storage.getAllReviews();
    
    // Trouver les avis qui ont échoué à cause du problème de champ email
    const failedEmailReviews = allReviews.filter(review => 
      review.status === 'failed' && 
      review.error?.includes('Impossible de trouver le champ email')
    );
    
    console.log(`\n📊 Trouvé ${failedEmailReviews.length} avis échoués à cause du problème de champ email.`);
    
    if (failedEmailReviews.length > 0) {
      // Sélectionner le premier avis échoué pour le test
      const reviewToTest = failedEmailReviews[0];
      console.log(`\n🔄 Tentative de republication de l'avis ID: ${reviewToTest.id}`);
      
      // Mettre à jour le statut de l'avis pour le retester
      await storage.updateReview(reviewToTest.id, {
        status: 'pending',
        error: null
      });
      
      // Obtenir un compte disponible
      const account = await accountRotationService.selectOptimalAccount('google', undefined, 'medium');
      
      if (!account) {
        throw new Error("❌ Aucun compte Google disponible pour la publication");
      }
      
      console.log(`\n👤 Compte sélectionné: ${account.email} (ID: ${account.id})`);
      
      // Assigner le compte à l'avis
      await storage.updateReview(reviewToTest.id, {
        postingAccountId: account.id,
        status: 'processing'
      });
      
      // Lancer la publication de l'avis avec notre code amélioré
      console.log("\n🚀 Début de la publication...");
      // Récupérer l'avis complet
      const reviewToPublish = await storage.getReview(reviewToTest.id);
      if (!reviewToPublish) {
        throw new Error(`Impossible de récupérer l'avis ID: ${reviewToTest.id}`);
      }
      const result = await automationService.processReviewImmediately(reviewToPublish);
      console.log(`\n📊 Résultat de la tentative: ${result.success ? '✅ Succès' : '❌ Échec'} - ${result.message}`);
      
      // Vérifier le nouveau statut
      const updatedReview = await storage.getReview(reviewToTest.id);
      console.log(`\n📊 Nouveau statut: ${updatedReview.status}`);
      
      if (updatedReview.status === 'published') {
        console.log("\n✅ SUCCÈS: L'amélioration de la détection des champs a résolu le problème!");
      } else if (updatedReview.error) {
        console.log(`\n❌ ÉCHEC: Nouvelle erreur rencontrée: ${updatedReview.error}`);
      }
    } else {
      console.log("\n🆕 Aucun avis avec l'erreur spécifique trouvé. Création d'un nouvel avis de test...");
      
      // Récupérer un business
      const businesses = await storage.getBusinesses();
      if (businesses.length === 0) {
        throw new Error("Aucun business trouvé dans la base de données");
      }
      
      const business = businesses[0];
      console.log(`\n📋 Business sélectionné: ${business.name} (ID: ${business.id})`);
      
      // Créer un nouvel avis
      const reviewContent = `★★★★★ Test de l'amélioration de détection des champs.
      Service exceptionnel! L'équipe est professionnelle et réactive.
      Je recommande vivement ce service à tous ceux qui recherchent qualité et fiabilité.
      Test effectué le ${new Date().toLocaleString()}.`;
      
      const newReview = await storage.createReview({
        businessId: business.id,
        content: reviewContent,
        platform: 'google',
        status: 'pending',
        createdAt: new Date(),
        postTime: null,
        error: null,
        postingAccountId: null
      });
      
      console.log(`\n✅ Nouvel avis créé avec ID: ${newReview.id}`);
      
      // Obtenir un compte disponible
      const account = await accountRotationService.selectOptimalAccount('google', undefined, 'medium');
      
      if (!account) {
        throw new Error("❌ Aucun compte Google disponible pour la publication");
      }
      
      console.log(`\n👤 Compte sélectionné: ${account.email} (ID: ${account.id})`);
      
      // Assigner le compte à l'avis
      await storage.updateReview(newReview.id, {
        postingAccountId: account.id,
        status: 'processing'
      });
      
      // Lancer la publication de l'avis avec notre code amélioré
      console.log("\n🚀 Début de la publication...");
      // Récupérer l'avis complet
      const reviewToPublish = await storage.getReview(newReview.id);
      if (!reviewToPublish) {
        throw new Error(`Impossible de récupérer l'avis ID: ${newReview.id}`);
      }
      const result = await automationService.processReviewImmediately(reviewToPublish);
      console.log(`\n📊 Résultat de la tentative: ${result.success ? '✅ Succès' : '❌ Échec'} - ${result.message}`);
      
      // Vérifier le statut final
      const finalReview = await storage.getReview(newReview.id);
      console.log(`\n📊 Statut final: ${finalReview.status}`);
      
      if (finalReview.status === 'published') {
        console.log("\n✅ SUCCÈS: L'avis a été publié avec succès!");
      } else if (finalReview.error) {
        console.log(`\n❌ ÉCHEC: Erreur rencontrée: ${finalReview.error}`);
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Erreur générale: ${error instanceof Error ? error.message : String(error)}`);
  }
}

testImprovedReview()
  .catch(err => {
    console.error(`\n❌ Erreur critique: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  })
  .finally(() => {
    console.log("\n✅ Test terminé");
  });