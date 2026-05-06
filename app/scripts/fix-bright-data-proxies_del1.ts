/**
 * Script de correction et vérification des proxies BrightData
 * 
 * Ce script analyse et teste la configuration des proxies BrightData,
 * diagnostique les problèmes et met en place des solutions de correction.
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './server/db';
import * as schema from './shared/schema';
import { eq, and, or, ne, sql, gte, lte, lt, gt, desc, asc, between, isNull } from 'drizzle-orm';

// Désactiver la vérification des certificats SSL pour les appels axios
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { SimpleLogger } from './shared/utils/logger';

// Configuration pour la journalisation
class Logger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  info(message: string, data?: Record<string, any>) {
    console.log(`[INFO] [${this.context}] ${message}`, data ? data : '');
  }
  
  warn(message: string, data?: Record<string, any>) {
    console.warn(`[WARN] [${this.context}] ${message}`, data ? data : '');
  }
  
  error(message: string, data?: Record<string, any>) {
    console.error(`[ERROR] [${this.context}] ${message}`, data ? data : '');
  }
}

// Classe de vérification et correction
class BrightDataProxyFixer {
  private logger = new Logger('bright-data-proxy-fixer');
  
  // Configuration par défaut des proxies BrightData
  private defaultProxies = [
    { country: 'FR', code: 'fr', host: 'brd.superproxy.io', port: 22225 },
    { country: 'UK', code: 'uk', host: 'brd.superproxy.io', port: 22225 },
    { country: 'DE', code: 'de', host: 'brd.superproxy.io', port: 22225 },
    { country: 'US', code: 'us', host: 'brd.superproxy.io', port: 22225 },
    { country: 'CA', code: 'ca', host: 'brd.superproxy.io', port: 22225 }
  ];
  
  // Configuration alternative pour les nouveaux points d'accès
  private alternativeProxies = [
    { country: 'FR', code: 'fr', host: 'zproxy.lum-superproxy.io', port: 22225 },
    { country: 'UK', code: 'gb', host: 'zproxy.lum-superproxy.io', port: 22225 },
    { country: 'DE', code: 'de', host: 'zproxy.lum-superproxy.io', port: 22225 },
    { country: 'US', code: 'us', host: 'zproxy.lum-superproxy.io', port: 22225 },
    { country: 'CA', code: 'ca', host: 'zproxy.lum-superproxy.io', port: 22225 }
  ];
  
  constructor() {
    // Initialisation
  }
  
  /**
   * Exécute la vérification et correction complète des proxies
   */
  public async run(): Promise<void> {
    try {
      this.logger.info('Début de la vérification et correction des proxies BrightData...');
      
      // 1. Vérifier les variables d'environnement
      await this.checkEnvironmentVariables();
      
      // 2. Tester la connexion aux proxies BrightData
      await this.testBrightDataConnectivity();
      
      // 3. Vérifier et réparer la base de données de proxies
      await this.fixProxyDatabase();
      
      // 4. Tester tous les proxies dans la base de données
      await this.testAllProxies();
      
      // 5. Initialiser le système avancé de proxies
      // Désactivation temporaire de l'initialisation du système avancé de proxies
      // await advancedProxyIntegration.initialize();
      
      this.logger.info('Vérification et correction des proxies BrightData terminées.');
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification des proxies: ${error.message}`);
    }
  }
  
  /**
   * Vérifie les variables d'environnement nécessaires
   */
  private async checkEnvironmentVariables(): Promise<void> {
    this.logger.info('Vérification des variables d\'environnement...');
    
    const username = process.env.BRIGHT_DATA_USERNAME;
    const password = process.env.BRIGHT_DATA_PASSWORD;
    
    let missingVars = [];
    
    if (!username) {
      missingVars.push('BRIGHT_DATA_USERNAME');
    }
    
    if (!password) {
      missingVars.push('BRIGHT_DATA_PASSWORD');
    }
    
    if (missingVars.length > 0) {
      this.logger.error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
      this.logger.info('Veuillez fournir ces variables d\'environnement pour utiliser BrightData.');
      
      // Si des variables sont manquantes, on ne peut pas continuer les tests
      return;
    }
    
    this.logger.info('Variables d\'environnement BrightData présentes.');
    
    // Masquer les identifiants dans les logs
    this.logger.info(`Utilisateur configuré: ${username.substring(0, 3)}...`);
    
    if (username.length < 5) {
      this.logger.warn('Le nom d\'utilisateur BrightData semble trop court, veuillez vérifier.');
    }
    
    if (password.length < 8) {
      this.logger.warn('Le mot de passe BrightData semble trop court, veuillez vérifier.');
    }
  }
  
  /**
   * Teste la connectivité aux proxies BrightData
   */
  private async testBrightDataConnectivity(): Promise<void> {
    this.logger.info('Test de connectivité aux proxies BrightData...');
    
    const username = process.env.BRIGHT_DATA_USERNAME;
    const password = process.env.BRIGHT_DATA_PASSWORD;
    
    if (!username || !password) {
      this.logger.error('Variables d\'environnement manquantes, impossible de tester la connectivité.');
      return;
    }
    
    let successfulTests = 0;
    let failedTests = 0;
    
    // Tester d'abord les points d'accès par défaut
    for (const proxy of this.defaultProxies) {
      try {
        this.logger.info(`Test du proxy BrightData pour ${proxy.country} (${proxy.host}:${proxy.port})...`);
        
        // Construction de l'URL du proxy
        // Modification: utiliser http au lieu de https pour l'URL du proxy
        const proxyUrl = `http://${username}:${password}@${proxy.host}:${proxy.port}`;
        const httpsAgent = new HttpsProxyAgent(proxyUrl);
        
        // Tentative de connexion avec timeout
        const response = await axios.get('https://lumtest.com/myip.json', {
          httpsAgent,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
        });
        
        if (response.data && response.data.ip) {
          this.logger.info(`✅ Connexion réussie au proxy ${proxy.country} (${proxy.host}): IP ${response.data.ip}`);
          successfulTests++;
        } else {
          this.logger.warn(`⚠️ Connexion réussie au proxy ${proxy.country} (${proxy.host}) mais réponse invalide.`);
          failedTests++;
        }
      } catch (error) {
        this.logger.error(`❌ Échec de connexion au proxy ${proxy.country} (${proxy.host}): ${error.message}`);
        failedTests++;
        
        // Analyser l'erreur pour fournir des diagnostics plus précis
        if (error.code === 'ENOTFOUND') {
          this.logger.error(`   ↳ Le nom d'hôte ${proxy.host} est introuvable. Vérifiez la connexion internet et les DNS.`);
        } else if (error.code === 'ETIMEDOUT') {
          this.logger.error(`   ↳ Délai d'attente dépassé lors de la connexion. Le proxy est peut-être bloqué.`);
        } else if (error.response && error.response.status === 407) {
          this.logger.error(`   ↳ Authentification au proxy échouée. Vérifiez vos identifiants.`);
        } else if (error.response && error.response.status === 403) {
          this.logger.error(`   ↳ Accès refusé. Votre IP est peut-être bloquée ou les identifiants sont incorrects.`);
        }
      }
    }
    
    // Si tous les tests ont échoué, essayer les proxies alternatifs
    if (successfulTests === 0 && failedTests > 0) {
      this.logger.warn('Tous les tests de connectivité aux proxies par défaut ont échoué. Essai avec les points d\'accès alternatifs...');
      
      for (const proxy of this.alternativeProxies) {
        try {
          this.logger.info(`Test du proxy alternatif BrightData pour ${proxy.country} (${proxy.host}:${proxy.port})...`);
          
          // Construction de l'URL du proxy
          // Modification: utiliser http au lieu de https pour l'URL du proxy
          const proxyUrl = `http://${username}-country-${proxy.code}:${password}@${proxy.host}:${proxy.port}`;
          const httpsAgent = new HttpsProxyAgent(proxyUrl);
          
          // Tentative de connexion avec timeout
          const response = await axios.get('https://lumtest.com/myip.json', {
            httpsAgent,
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
          });
          
          if (response.data && response.data.ip) {
            this.logger.info(`✅ Connexion réussie au proxy alternatif ${proxy.country} (${proxy.host}): IP ${response.data.ip}`);
            successfulTests++;
            
            // Ajouter ce proxy qui fonctionne à la base de données
            try {
              await db.insert(schema.proxies)
                .values({
                  host: proxy.host,
                  port: proxy.port,
                  username: `${username}-country-${proxy.code}`,
                  password: password,
                  type: 'residential',
                  country: proxy.country,
                  status: 'active',
                  provider: 'brightdata',
                  options: {},
                  city: null,
                  region: null,
                  specializedFor: [proxy.country.toLowerCase()]
                });
              
              this.logger.info(`Proxy alternatif BrightData ajouté pour ${proxy.country} (${proxy.host}:${proxy.port}).`);
            } catch (error) {
              this.logger.error(`Erreur lors de l'ajout du proxy alternatif ${proxy.host}: ${error.message}`);
            }
          } else {
            this.logger.warn(`⚠️ Connexion réussie au proxy alternatif ${proxy.country} (${proxy.host}) mais réponse invalide.`);
            failedTests++;
          }
        } catch (error) {
          this.logger.error(`❌ Échec de connexion au proxy alternatif ${proxy.country} (${proxy.host}): ${error.message}`);
          failedTests++;
        }
      }
    }
    
    if (successfulTests === 0 && failedTests > 0) {
      this.logger.warn('Tous les tests de connectivité ont échoué. Vérifiez vos identifiants et votre connexion.');
      
      if (/user-[a-z]/.test(username)) {
        this.logger.info('⚠️ Votre nom d\'utilisateur commence par "user-", ce qui est un format correct pour BrightData.');
      } else {
        this.logger.warn('⚠️ Vérifiez le format de votre nom d\'utilisateur. Il devrait généralement commencer par "user-".');
      }
      
      this.logger.info('ℹ️ Suggestions de résolution:');
      this.logger.info('   1. Vérifiez vos identifiants BrightData');
      this.logger.info('   2. Vérifiez que votre compte BrightData est actif et possède un solde suffisant');
      this.logger.info('   3. Vérifiez que votre zone résidentielle est correctement configurée');
      this.logger.info('   4. Vérifiez que vous n\'êtes pas derrière un proxy ou un VPN qui bloque les connexions');
      this.logger.info('   5. Vérifiez dans l\'interface BrightData que les points d\'accès sont corrects pour votre compte');
    } else if (successfulTests > 0) {
      this.logger.info(`Tests de connectivité terminés: ${successfulTests} réussis, ${failedTests} échoués.`);
    }
  }
  
  /**
   * Vérifie et répare la base de données de proxies
   */
  private async fixProxyDatabase(): Promise<void> {
    this.logger.info('Vérification et réparation de la base de données de proxies...');
    
    try {
      // Récupérer tous les proxies dans la base de données
      const existingProxies = await db.select().from(schema.proxies);
      this.logger.info(`${existingProxies.length} proxies trouvés dans la base de données.`);
      
      // Vérifier si les proxies BrightData sont présents
      const brightDataProxies = existingProxies.filter(p => 
        (p.host.includes('brightdata.com') || p.host.includes('superproxy.io') || p.host.includes('lum-superproxy.io')) && 
        p.provider === 'brightdata'
      );
      
      if (brightDataProxies.length === 0) {
        this.logger.info('Aucun proxy BrightData trouvé dans la base de données. Ajout des proxies par défaut...');
        
        // Ajouter les proxies par défaut
        for (const proxy of this.defaultProxies) {
          try {
            await db.insert(schema.proxies)
              .values({
                host: proxy.host,
                port: proxy.port,
                username: process.env.BRIGHT_DATA_USERNAME || null,
                password: process.env.BRIGHT_DATA_PASSWORD || null,
                type: 'residential',
                country: proxy.country,
                status: 'active',
                provider: 'brightdata',
                options: {},
                city: null,
                region: null,
                specializedFor: [proxy.country.toLowerCase()]
              });
            
            this.logger.info(`Proxy BrightData ajouté pour ${proxy.country} (${proxy.host}:${proxy.port}).`);
          } catch (error) {
            this.logger.error(`Erreur lors de l'ajout du proxy ${proxy.host}: ${error.message}`);
          }
        }
      } else {
        this.logger.info(`${brightDataProxies.length} proxies BrightData trouvés dans la base de données.`);
        
        // Mettre à jour les informations d'identification des proxies
        if (process.env.BRIGHT_DATA_USERNAME && process.env.BRIGHT_DATA_PASSWORD) {
          for (const proxy of brightDataProxies) {
            try {
              await db.update(schema.proxies)
                .set({
                  username: proxy.host.includes('lum-superproxy.io') 
                    ? `${process.env.BRIGHT_DATA_USERNAME}-country-${proxy.country.toLowerCase()}`
                    : process.env.BRIGHT_DATA_USERNAME,
                  password: process.env.BRIGHT_DATA_PASSWORD,
                  status: 'active', // Réactiver les proxies
                  specializedFor: proxy.specializedFor || [proxy.country.toLowerCase()]
                })
                .where(eq(schema.proxies.id, proxy.id));
              
              this.logger.info(`Informations d'identification mises à jour pour le proxy ${proxy.host}:${proxy.port}.`);
            } catch (error) {
              this.logger.error(`Erreur lors de la mise à jour du proxy ${proxy.host}: ${error.message}`);
            }
          }
        }
      }
      
      // Vérifier si nous avons des proxies manquants (basé sur les proxies par défaut)
      for (const defaultProxy of this.defaultProxies) {
        const exists = existingProxies.some(p => 
          p.host === defaultProxy.host && p.port === defaultProxy.port
        );
        
        if (!exists) {
          try {
            await db.insert(schema.proxies)
              .values({
                host: defaultProxy.host,
                port: defaultProxy.port,
                username: process.env.BRIGHT_DATA_USERNAME || null,
                password: process.env.BRIGHT_DATA_PASSWORD || null,
                type: 'residential',
                country: defaultProxy.country,
                status: 'active',
                provider: 'brightdata',
                options: {},
                city: null,
                region: null,
                specializedFor: [defaultProxy.country.toLowerCase()]
              });
            
            this.logger.info(`Proxy manquant ajouté pour ${defaultProxy.country} (${defaultProxy.host}:${defaultProxy.port}).`);
          } catch (error) {
            this.logger.error(`Erreur lors de l'ajout du proxy manquant ${defaultProxy.host}: ${error.message}`);
          }
        }
      }
      
      // Ajouter également les proxies alternatifs s'ils ne sont pas présents
      for (const altProxy of this.alternativeProxies) {
        const exists = existingProxies.some(p => 
          p.host === altProxy.host && 
          p.port === altProxy.port && 
          p.country === altProxy.country
        );
        
        if (!exists) {
          try {
            await db.insert(schema.proxies)
              .values({
                host: altProxy.host,
                port: altProxy.port,
                username: `${process.env.BRIGHT_DATA_USERNAME}-country-${altProxy.code}`,
                password: process.env.BRIGHT_DATA_PASSWORD || null,
                type: 'residential',
                country: altProxy.country,
                status: 'active',
                provider: 'brightdata',
                options: {},
                city: null,
                region: null,
                specializedFor: [altProxy.country.toLowerCase()]
              });
            
            this.logger.info(`Proxy alternatif ajouté pour ${altProxy.country} (${altProxy.host}:${altProxy.port}).`);
          } catch (error) {
            this.logger.error(`Erreur lors de l'ajout du proxy alternatif ${altProxy.host}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de la base de données de proxies: ${error.message}`);
    }
  }
  
  /**
   * Teste tous les proxies dans la base de données
   */
  private async testAllProxies(): Promise<void> {
    this.logger.info('Test de tous les proxies dans la base de données...');
    
    try {
      // Récupérer tous les proxies
      const proxies = await db.select().from(schema.proxies);
      
      if (proxies.length === 0) {
        this.logger.info('Aucun proxy à tester.');
        return;
      }
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const proxy of proxies) {
        try {
          this.logger.info(`Test du proxy ${proxy.host}:${proxy.port} (${proxy.country})...`);
          
          // Vérifier si les identifiants sont présents
          if (!proxy.username || !proxy.password) {
            if (process.env.BRIGHT_DATA_USERNAME && process.env.BRIGHT_DATA_PASSWORD) {
              proxy.username = process.env.BRIGHT_DATA_USERNAME;
              proxy.password = process.env.BRIGHT_DATA_PASSWORD;
            } else {
              this.logger.warn(`Proxy ${proxy.host} sans identifiants, test ignoré.`);
              continue;
            }
          }
          
          // Construction de l'URL du proxy
          // Modification: utiliser http au lieu de https pour l'URL du proxy
          const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
          const httpsAgent = new HttpsProxyAgent(proxyUrl);
          
          // Tentative de connexion avec timeout
          const response = await axios.get('https://lumtest.com/myip.json', {
            httpsAgent,
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
          });
          
          if (response.data && response.data.ip) {
            this.logger.info(`✅ Test réussi pour ${proxy.host}: IP ${response.data.ip}`);
            
            // Mettre à jour le proxy avec les informations de géolocalisation et le statut
            await db.update(schema.proxies)
              .set({
                status: 'active',
                ip: response.data.ip,
                country: response.data.country || proxy.country,
                city: response.data.city || null,
                region: response.data.region || null,
                lastStatusChange: new Date(),
                consecutiveFailures: 0,
                totalSuccesses: (proxy.totalSuccesses || 0) + 1
              })
              .where(eq(schema.proxies.id, proxy.id));
            
            successCount++;
          } else {
            this.logger.warn(`⚠️ Test réussi pour ${proxy.host} mais réponse invalide.`);
            failureCount++;
            
            // Mettre à jour le proxy comme douteux
            await db.update(schema.proxies)
              .set({
                status: 'active', // On le garde actif mais avec une note d'échec
                lastStatusChange: new Date(),
                consecutiveFailures: (proxy.consecutiveFailures || 0) + 1,
                totalFailures: (proxy.totalFailures || 0) + 1
              })
              .where(eq(schema.proxies.id, proxy.id));
          }
        } catch (error) {
          this.logger.error(`❌ Test échoué pour ${proxy.host}: ${error.message}`);
          failureCount++;
          
          // Mettre à jour le proxy comme en échec
          await db.update(schema.proxies)
            .set({
              status: 'blocked',
              lastStatusChange: new Date(),
              consecutiveFailures: (proxy.consecutiveFailures || 0) + 1,
              totalFailures: (proxy.totalFailures || 0) + 1
            })
            .where(eq(schema.proxies.id, proxy.id));
        }
      }
      
      this.logger.info(`Tests des proxies terminés: ${successCount} réussis, ${failureCount} échoués.`);
      
      if (successCount === 0 && failureCount > 0) {
        this.logger.warn('❗ Tous les tests de proxies ont échoué. Vérifiez vos identifiants et votre connexion.');
        this.logger.info('ℹ️ Suggestions de résolution:');
        this.logger.info('   1. Vérifiez vos identifiants BrightData');
        this.logger.info('   2. Vérifiez que votre compte BrightData est actif');
        this.logger.info('   3. Essayez de mettre à jour vos identifiants via l\'interface BrightData');
        this.logger.info('   4. Vérifiez les restrictions réseau de votre environnement');
      }
    } catch (error) {
      this.logger.error(`Erreur lors des tests des proxies: ${error.message}`);
    }
  }
}

// Exécution du script
(async () => {
  try {
    const fixer = new BrightDataProxyFixer();
    await fixer.run();
    
    console.log('Script de correction des proxies BrightData terminé.');
    process.exit(0);
  } catch (error) {
    console.error(`Erreur non gérée: ${error.message}`);
    process.exit(1);
  }
})();