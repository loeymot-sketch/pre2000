import { db } from './server/db';
import { PgStorage } from './server/pg-storage';
import { AutomationService } from './server/services/automation.service';
import { ProxyService } from './server/services/proxy.service';
import { AccountRotationService } from './server/services/account-rotation.service';
import { LoggerService } from './server/services/logger.service';

// Initialisation des services
const logger = new LoggerService();
const storage = new PgStorage();
const proxyService = new ProxyService(storage, logger);
const accountRotation = new AccountRotationService(storage, logger);
const automationService = new AutomationService(storage, proxyService, accountRotation, logger);

async function createTestReview() {
  console.log("🚀 CRÉATION ET PUBLICATION D'UN NOUVEL AVIS DE TEST");

  try {
    // Se connecter à la base de données
    await storage.initialize();
    console.log("\n✅ Connexion à la base de données établie");

    // Récupérer le business de test
    const businesses = await storage.getAllBusinesses();
    if (businesses.length === 0) {
      throw new Error("Aucun business trouvé dans la base de données");
    }
    const business = businesses[0];
    console.log(`\n📋 Utilisation du business: ${business.name} (ID: ${business.id})`);

    // Créer un nouvel avis
    const reviewContent = `★★★★★ Je suis vraiment impressionné par la qualité des services offerts. 
    L'expérience utilisateur est exceptionnelle et l'équipe est très réactive. 
    Je recommande fortement ce service à tous ceux qui cherchent une solution fiable et efficace.
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
    console.log(`\n📝 Contenu: ${reviewContent.substring(0, 100)}...`);

    // Lancer la publication
    console.log("\n🚀 Lancement de la publication de l'avis...");
    
    try {
      // Récupérer un compte disponible
      const account = await accountRotation.getNextAccount('google');
      if (!account) {
        throw new Error("Aucun compte Google disponible");
      }
      
      console.log(`\n👤 Compte sélectionné: ${account.email} (ID: ${account.id})`);
      
      // Mettre à jour l'avis avec l'ID du compte
      await storage.updateReview(newReview.id, {
        postingAccountId: account.id,
        status: 'processing'
      });
      
      // Publier l'avis
      await automationService.publishReview(newReview.id);
      
      // Vérifier le statut après publication
      const updatedReview = await storage.getReview(newReview.id);
      console.log(`\n✅ Publication terminée avec statut: ${updatedReview.status}`);
      
      if (updatedReview.error) {
        console.log(`\n❌ Erreur: ${updatedReview.error}`);
      } else {
        console.log(`\n✅ L'avis a été publié avec succès !`);
      }
    } catch (error) {
      console.error(`\n❌ Erreur lors de la publication: ${error instanceof Error ? error.message : String(error)}`);
      
      // Mettre à jour l'avis en cas d'erreur
      await storage.updateReview(newReview.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Récupérer le statut final
    const finalReview = await storage.getReview(newReview.id);
    console.log(`\n📊 Statut final: ${finalReview.status}`);
    console.log(`\n📅 Date de création: ${finalReview.createdAt}`);
    if (finalReview.postTime) {
      console.log(`\n📅 Date de publication: ${finalReview.postTime}`);
    }
    if (finalReview.error) {
      console.log(`\n❌ Message d'erreur: ${finalReview.error}`);
    }

  } catch (error) {
    console.error(`\n❌ Erreur générale: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Fermer la connexion à la base de données
    await storage.close();
    console.log("\n✅ Connexion à la base de données fermée");
  }
}

createTestReview()
  .catch(err => {
    console.error(`\n❌ Erreur critique: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });