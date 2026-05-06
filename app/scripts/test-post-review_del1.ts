/**
 * Script de test pour vérifier le statut d'un avis existant
 * 
 * Ce script vérifie uniquement le statut d'un avis déjà créé
 * en utilisant l'API PostgreSQL directement.
 */

// Utiliser l'importation CommonJS pour pg
import pg from 'pg';
const { Client } = pg;

async function checkReviewStatus() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🧪 DÉMARRAGE DE LA VÉRIFICATION DE STATUT D'AVIS\n");
    
    // Connexion à la base de données
    await client.connect();
    console.log("✅ Connexion à la base de données établie\n");
    
    // ID de l'avis à vérifier
    const reviewId = 67;
    
    // Requête SQL pour obtenir les détails de l'avis
    const query = 'SELECT * FROM reviews WHERE id = $1';
    const result = await client.query(query, [reviewId]);
    
    if (result.rows.length > 0) {
      const review = result.rows[0];
      
      // Afficher toutes les clés disponibles pour le débogage
      console.log("📊 Clés disponibles dans l'objet review:", Object.keys(review));

      console.log("\n📊 Statut actuel de l'avis:");
      console.log(`- ID: ${review.id}`);
      console.log(`- Statut: ${review.status}`);
      console.log(`- Erreur: ${review.error || 'Aucune erreur'}`);
      console.log(`- Créé: ${review.createdAt}`);
      console.log(`- Plateforme: ${review.platform}`);
      console.log(`- Compte utilisé: ${review.postingAccountId || 'Non assigné'}`);
      console.log(`- Business ID: ${review.businessId}`);
      
      // Afficher un extrait du contenu de l'avis
      if (review.content) {
        console.log(`- Contenu (extrait): ${review.content.substring(0, 50)}...`);
      }
      
      // Vérifier si l'avis est toujours en attente, en cours, ou terminé
      if (review.status === 'pending' || review.status === 'in_progress') {
        console.log("\n⚠️ L'avis est encore en cours de traitement. Le système va continuer à tenter de le publier en arrière-plan.");
      } else if (review.status === 'completed' || review.status === 'posted') {
        console.log("\n🎉 L'avis a été publié avec succès!");
      } else if (review.status === 'retrying') {
        console.log("\n⚠️ L'avis est en cours de nouvelle tentative. Vérifiez les logs pour plus de détails.");
      } else if (review.status === 'failed') {
        console.log(`\n❌ Échec de la publication: ${review.error}`);
      }
    } else {
      console.log(`\n❌ Impossible de trouver l'avis avec l'ID ${reviewId}`);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
  } finally {
    // Fermer la connexion à la base de données
    await client.end();
    console.log("\n✅ Connexion à la base de données fermée");
  }
}

// Exécuter la vérification
checkReviewStatus().catch(console.error);