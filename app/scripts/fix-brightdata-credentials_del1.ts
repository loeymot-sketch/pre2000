/**
 * Script de correction des identifiants BrightData
 * 
 * Ce script permet de corriger et vérifier les identifiants BrightData
 * pour résoudre les erreurs de connexion aux proxies.
 */

import { SimpleLogger } from './shared/utils/logger';
import { advancedProxyIntegration } from './advanced-proxy-integration';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const logger = new SimpleLogger('fix-brightdata-credentials');

interface BrightDataConfig {
  username: string;
  password: string;
}

/**
 * Demande à l'utilisateur de saisir les identifiants BrightData
 */
async function promptForCredentials(): Promise<BrightDataConfig> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    logger.info('Veuillez saisir vos identifiants BrightData:');
    
    rl.question('Nom d\'utilisateur BrightData: ', (username) => {
      rl.question('Mot de passe BrightData: ', (password) => {
        rl.close();
        resolve({ username, password });
      });
    });
  });
}

/**
 * Charge les identifiants BrightData depuis les variables d'environnement ou le fichier de configuration
 */
function loadExistingCredentials(): BrightDataConfig | null {
  try {
    // D'abord, vérifier si les identifiants sont dans les variables d'environnement
    if (process.env.BRIGHT_DATA_USERNAME && process.env.BRIGHT_DATA_PASSWORD) {
      return {
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD
      };
    }
    
    // Sinon, vérifier le fichier de configuration
    const configPath = path.join(process.cwd(), 'data', 'security', 'brightdata-config.json');
    
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      if (config.username && config.password) {
        return {
          username: config.username,
          password: config.password
        };
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Erreur lors du chargement des identifiants existants: ${error.message}`);
    return null;
  }
}

/**
 * Corrige les identifiants BrightData
 */
async function fixBrightDataCredentials() {
  try {
    logger.info('Démarrage de la correction des identifiants BrightData...');
    
    // Initialiser le système d'intégration de proxies
    await advancedProxyIntegration.initialize();
    
    // Vérifier si des identifiants existent déjà
    const existingCredentials = loadExistingCredentials();
    
    if (existingCredentials) {
      logger.info('Identifiants BrightData existants trouvés. Vérification...');
      
      // Tenter de corriger avec les identifiants existants
      const result = await advancedProxyIntegration.fixBrightDataCredentials(
        existingCredentials.username,
        existingCredentials.password
      );
      
      if (result) {
        logger.info('Les identifiants BrightData existants sont valides et ont été appliqués avec succès.');
        return;
      } else {
        logger.warn('Les identifiants BrightData existants ne fonctionnent pas.');
      }
    } else {
      logger.warn('Aucun identifiant BrightData existant trouvé.');
    }
    
    // Demander à l'utilisateur de saisir les identifiants
    const newCredentials = await promptForCredentials();
    
    logger.info('Mise à jour des identifiants BrightData...');
    
    // Appliquer les nouveaux identifiants
    const result = await advancedProxyIntegration.fixBrightDataCredentials(
      newCredentials.username,
      newCredentials.password
    );
    
    if (result) {
      logger.info('Les identifiants BrightData ont été mis à jour avec succès.');
      
      // Sauvegarder les identifiants dans les variables d'environnement
      process.env.BRIGHT_DATA_USERNAME = newCredentials.username;
      process.env.BRIGHT_DATA_PASSWORD = newCredentials.password;
      
      // Mettre à jour le fichier .env
      updateEnvFile(newCredentials);
    } else {
      logger.error('Échec de la mise à jour des identifiants BrightData. Veuillez vérifier les identifiants fournis.');
    }
  } catch (error) {
    logger.error(`Erreur lors de la correction des identifiants BrightData: ${error.message}`);
  }
}

/**
 * Met à jour le fichier .env avec les identifiants BrightData
 */
function updateEnvFile(credentials: BrightDataConfig): void {
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    // Vérifier si le fichier .env existe
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Mettre à jour les variables existantes
      envContent = envContent.replace(/^BRIGHT_DATA_USERNAME=.*$/m, `BRIGHT_DATA_USERNAME=${credentials.username}`);
      envContent = envContent.replace(/^BRIGHT_DATA_PASSWORD=.*$/m, `BRIGHT_DATA_PASSWORD=${credentials.password}`);
      
      // Si les variables n'existent pas, les ajouter
      if (!envContent.includes('BRIGHT_DATA_USERNAME=')) {
        envContent += `\nBRIGHT_DATA_USERNAME=${credentials.username}`;
      }
      
      if (!envContent.includes('BRIGHT_DATA_PASSWORD=')) {
        envContent += `\nBRIGHT_DATA_PASSWORD=${credentials.password}`;
      }
    } else {
      // Créer un nouveau fichier .env
      envContent = `# Automatically generated .env file
BRIGHT_DATA_USERNAME=${credentials.username}
BRIGHT_DATA_PASSWORD=${credentials.password}
`;
    }
    
    // Sauvegarder le fichier .env
    fs.writeFileSync(envPath, envContent);
    
    logger.info('Fichier .env mis à jour avec les identifiants BrightData.');
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du fichier .env: ${error.message}`);
  }
}

// Exécuter le script si lancé directement
if (require.main === module) {
  fixBrightDataCredentials();
}

export { fixBrightDataCredentials };