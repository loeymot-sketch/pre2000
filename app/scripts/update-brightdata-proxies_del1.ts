/**
 * Script pour mettre à jour les identifiants BrightData avec les valeurs exactes
 */

import pg from 'pg';

// Initialiser la connexion à la base de données
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateBrightDataCredentials() {
  console.log('Début de la mise à jour des identifiants BrightData...');

  try {
    // Récupérer tous les proxies BrightData
    const { rows: proxies } = await pool.query(
      `SELECT * FROM proxies WHERE host LIKE '%brd.superproxy.io%'`
    );

    console.log(`${proxies.length} proxies BrightData trouvés`);

    // Identifiants corrects provenant des variables d'environnement
    const username = process.env.BRIGHT_DATA_USERNAME;
    const password = process.env.BRIGHT_DATA_PASSWORD;

    if (!username || !password) {
      console.error('Identifiants BrightData manquants dans les variables d\'environnement');
      return;
    }

    console.log(`Mise à jour des identifiants avec ${username}:${password.substring(0, 3)}...`);

    // Mettre à jour les identifiants de tous les proxies
    const updateResult = await pool.query(
      `UPDATE proxies 
       SET username = $1, password = $2, updated_at = NOW()
       WHERE host LIKE '%brd.superproxy.io%'`,
      [username, password]
    );

    console.log('Mise à jour réussie des identifiants BrightData');
    
    // Réactiver les proxies bloqués
    const reactivateResult = await pool.query(
      `UPDATE proxies 
       SET status = 'active', consecutive_failures = 0, updated_at = NOW()
       WHERE host LIKE '%brd.superproxy.io%' AND status = 'blocked'`
    );

    console.log('Réactivation des proxies bloqués terminée');

    console.log('Mise à jour des proxies BrightData terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des proxies BrightData:', error);
  } finally {
    await pool.end();
  }
}

// Exécuter la fonction principale
updateBrightDataCredentials();