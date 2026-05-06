/**
 * Script de correction du service de proxy
 * 
 * Ce script corrige le service de proxy pour utiliser le bon format 
 * d'URL pour les proxies Bright Data.
 */

import fs from 'fs';
import path from 'path';

// Configuration
const LOG_FILE = `./fix-proxy-service-${Date.now()}.log`;
const PROXY_SERVICE_PATH = './server/services/proxy.service.ts';

// Fonction pour la journalisation
function log(message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

/**
 * Fonction principale qui corrige le service de proxy
 */
async function fixProxyService() {
  try {
    log('🔄 Lecture du fichier du service de proxy...');
    
    if (!fs.existsSync(PROXY_SERVICE_PATH)) {
      log(`❌ Erreur: Le fichier ${PROXY_SERVICE_PATH} n'existe pas`);
      return false;
    }
    
    let content = fs.readFileSync(PROXY_SERVICE_PATH, 'utf-8');
    log(`✅ Fichier lu avec succès (${content.length} caractères)`);
    
    // 1. Correction du format d'URL pour les proxies résidentiels avec ciblage par pays
    const originalProxyUrlFormat = content.match(/const proxyUrl\s*=\s*`[^`]+`\s*;/g);
    
    if (!originalProxyUrlFormat) {
      log('⚠️ Aucun format d\'URL proxy à corriger trouvé');
    } else {
      log(`🔎 Formats d'URL proxy trouvés: ${originalProxyUrlFormat.length}`);
      
      // Parcourir tous les formats trouvés et les corriger si nécessaire
      let modified = false;
      
      for (const format of originalProxyUrlFormat) {
        // Si le format contient déjà le bon modèle, on le laisse
        if (format.includes('-country-') && format.includes('brd.superproxy.io')) {
          log('✅ Format d\'URL déjà correct, aucune modification nécessaire');
          continue;
        }
        
        // Format erroné trouvé, on le corrige
        log(`🔧 Correction du format: ${format}`);
        
        // Créer le nouveau format correct
        const newFormat = 'const proxyUrl = `http://${username}-country-${country}:${password}@brd.superproxy.io:22225`;';
        
        // Remplacer dans le contenu
        content = content.replace(format, newFormat);
        modified = true;
        
        log(`✅ Format corrigé: ${newFormat}`);
      }
      
      if (modified) {
        // Sauvegarder une copie de sauvegarde du fichier original
        fs.writeFileSync(`${PROXY_SERVICE_PATH}.backup`, fs.readFileSync(PROXY_SERVICE_PATH));
        log('📦 Sauvegarde du fichier original créée');
        
        // Écrire le contenu modifié
        fs.writeFileSync(PROXY_SERVICE_PATH, content);
        log('✅ Modifications enregistrées avec succès');
      } else {
        log('ℹ️ Aucune modification nécessaire');
      }
    }
    
    // 2. Vérifier et corriger la méthode getProxy si nécessaire
    if (content.includes('getProxy') && !content.includes('getProxyByCountry')) {
      log('🔄 Ajout de la méthode getProxyByCountry...');
      
      // Trouver la classe ProxyService
      const classMatch = content.match(/export\s+class\s+ProxyService\s*{[^}]*}/s);
      
      if (classMatch) {
        const classContent = classMatch[0];
        
        // Vérifier si getProxyByCountry existe déjà
        if (classContent.includes('getProxyByCountry')) {
          log('✅ La méthode getProxyByCountry existe déjà');
        } else {
          // Ajouter la méthode getProxyByCountry
          const getProxyMethod = content.match(/async\s+getProxy\s*\([^)]*\)\s*{[^}]*}/s);
          
          if (getProxyMethod) {
            const newMethod = `
  /**
   * Récupère un proxy pour un pays spécifique
   */
  async getProxyByCountry(country: string): Promise<any> {
    try {
      const query = { 
        country: country.toUpperCase(),
        status: 'active'
      };
      
      const proxy = await this.storage.getProxy(query);
      
      if (!proxy) {
        // Fallback sur un proxy quelconque si aucun proxy n'est trouvé pour ce pays
        console.warn(\`Aucun proxy trouvé pour le pays \${country}, utilisation d'un proxy par défaut\`);
        return this.getProxy();
      }
      
      return proxy;
    } catch (error) {
      console.error(\`Erreur lors de la récupération d'un proxy pour \${country}: \${error}\`);
      throw error;
    }
  }`;
            
            // Ajouter la nouvelle méthode juste après getProxy
            const newClassContent = classContent.replace(
              getProxyMethod[0],
              `${getProxyMethod[0]}\n${newMethod}`
            );
            
            content = content.replace(classContent, newClassContent);
            
            // Sauvegarder une copie de sauvegarde si pas déjà fait
            if (!fs.existsSync(`${PROXY_SERVICE_PATH}.backup`)) {
              fs.writeFileSync(`${PROXY_SERVICE_PATH}.backup`, fs.readFileSync(PROXY_SERVICE_PATH));
              log('📦 Sauvegarde du fichier original créée');
            }
            
            // Écrire le contenu modifié
            fs.writeFileSync(PROXY_SERVICE_PATH, content);
            log('✅ Méthode getProxyByCountry ajoutée avec succès');
          } else {
            log('⚠️ Impossible de trouver la méthode getProxy pour ajouter getProxyByCountry');
          }
        }
      } else {
        log('⚠️ Impossible de trouver la classe ProxyService');
      }
    }
    
    log('🏁 Corrections terminées avec succès');
    return true;
  } catch (error) {
    log(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Exécution
async function main() {
  try {
    log('🚀 Démarrage du script de correction du service de proxy...');
    const success = await fixProxyService();
    log(`🏁 Script terminé avec ${success ? 'succès' : 'des erreurs'}`);
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`❌ Erreur générale: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Exécution
main();