/**
 * Contrôleur pour les opérations de test et d'initialisation
 */

import { Express, Request, Response } from 'express';
import { storage, initializeStorage } from '../storage';
import { db } from '../db';

/**
 * Enregistre les routes pour les opérations de test
 */
export function registerTestSetupRoutes(app: Express): void {
  // Route pour vérifier l'état de l'API
  app.get('/api/test-setup/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'API fonctionnelle'
    });
  });

  // Route pour initialiser les données de test
  app.post('/api/test-setup/init-data', async (req: Request, res: Response) => {
    try {
      // Initialiser le stockage avec PostgreSQL
      await initializeStorage(true);

      // Vérifier si une entreprise existe déjà
      const existingBusiness = await storage.getBusiness(1);
      
      if (!existingBusiness) {
        // Créer une entreprise de test
        const business = await storage.createBusiness({
          name: "Test Business",
          type: "Restaurant",
          description: "Restaurant de test pour l'application",
          products: "Restaurant gastronomique",
          keywords: "restaurant, gastronomie, test",
          websiteUrl: "https://example.com",
          address: "123 Test Street, Test City",
          userId: 1
        });
        
        console.log(`Entreprise créée avec ID ${business.id}`);
      }
      
      // Vérifier si un compte existe déjà
      const accounts = await storage.getPostingAccountsByPlatform('google');
      let account;
      
      if (accounts.length === 0) {
        // Créer un compte de test
        account = await storage.createPostingAccount({
          email: "test_account@example.com",
          password: "Test123!@#",
          platform: "google",
          status: "active",
          country: "FR",
          language: "fr",
          reviewCount: 0,
          consecutiveUses: 0
        });
        
        console.log(`Compte créé avec ID ${account.id}`);
      } else {
        account = accounts[0];
      }
      
      // Vérifier si un proxy existe déjà
      const proxies = await storage.getProxies();
      let proxy;
      
      if (proxies.length === 0) {
        // Créer un proxy de test
        proxy = await storage.createProxy({
          host: "127.0.0.1",
          port: 8080,
          username: "proxyuser",
          password: "proxypass",
          type: "residential",
          country: "FR",
          status: "active"
        });
        
        console.log(`Proxy créé avec ID ${proxy.id}`);
      } else {
        proxy = proxies[0];
      }
      
      return res.status(200).json({
        success: true,
        message: "Données de test initialisées",
        data: {
          business: existingBusiness || { id: 1 },
          account: {
            id: account.id,
            email: account.email
          },
          proxy: {
            id: proxy.id,
            host: proxy.host
          }
        }
      });
    } catch (error) {
      console.error("Erreur lors de l'initialisation des données de test:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'initialisation des données de test",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Route pour tester la publication réelle
  app.post('/api/test-setup/test-publish', async (req: Request, res: Response) => {
    try {
      // S'assurer que le stockage est initialisé
      await initializeStorage(true);
      
      const { businessId = 1, content = "Excellent service!", rating = 5 } = req.body;
      
      // Vérifier que l'entreprise existe
      const business = await storage.getBusiness(parseInt(businessId.toString()));
      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Entreprise non trouvée"
        });
      }
      
      // Récupérer un compte actif
      const accounts = await storage.getPostingAccountsByPlatform("google");
      const activeAccounts = accounts.filter(a => a.status === "active");
      
      if (activeAccounts.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Aucun compte Google actif disponible"
        });
      }
      
      const account = activeAccounts[0];
      
      // Récupérer un proxy actif
      const proxies = await storage.getProxies();
      const activeProxies = proxies.filter(p => p.status === "active");
      
      if (activeProxies.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Aucun proxy actif disponible"
        });
      }
      
      const proxy = activeProxies[0];
      
      // Créer l'avis dans la base de données
      const review = await storage.createReview({
        businessId: parseInt(businessId.toString()),
        content,
        title: "Test Review",
        rating: parseInt(rating.toString()),
        platform: "google",
        status: 'pending',
        postingAccountId: account.id,
        accountId: account.id, // Ajout explicite de accountId pour assurer la compatibilité avec le service de publication
        proxyId: proxy.id,
        isAnonymous: false
      });
      
      console.log(`Avis de test créé avec ID ${review.id}`);
      
      // Lancer la publication réelle en arrière-plan
      setTimeout(async () => {
        try {
          const { realPostingService } = await import("../services/real-posting.service");
          try {
            const success = await realPostingService.publishReview(review.id);
            console.log(`Avis de test ${review.id} publié en mode réel avec succès`);
          } catch (error) {
            console.error(`Échec de la publication réelle pour l'avis de test ${review.id}:`, error);
          }
        } catch (error) {
          console.error(`Erreur lors de la publication de l'avis de test ${review.id}:`, error);
        }
      }, 500);
      
      return res.status(202).json({
        success: true,
        message: "Avis de test créé et publication en cours",
        reviewId: review.id,
        accountId: account.id,
        proxyId: proxy.id
      });
    } catch (error) {
      console.error("Erreur lors du test de publication:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors du test de publication",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}