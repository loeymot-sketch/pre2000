/**
 * Script pour générer un rapport détaillé à partir des résultats de test
 * 
 * Ce script :
 * - Analyse les fichiers de logs générés par le test batch
 * - Produit un rapport détaillé sur l'exécution
 * - Identifie les problèmes et recommande des améliorations
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './services/logger.service';

// Configuration
const SUMMARY_FILE = path.join(process.cwd(), 'test-batch-summary.json');
const LOG_FILE = path.join(process.cwd(), 'test-batch-report.log');
const DETAILED_REPORT_FILE = path.join(process.cwd(), 'test-batch-detailed-report.md');
const CHART_DATA_FILE = path.join(process.cwd(), 'test-batch-chart-data.json');

async function generateDetailedReport() {
  console.log('Génération du rapport détaillé...');
  
  try {
    // Vérifier que les fichiers d'entrée existent
    if (!fs.existsSync(SUMMARY_FILE)) {
      throw new Error(`Fichier de résumé non trouvé: ${SUMMARY_FILE}`);
    }
    
    if (!fs.existsSync(LOG_FILE)) {
      throw new Error(`Fichier de logs non trouvé: ${LOG_FILE}`);
    }
    
    // Charger les données de résumé et les logs
    const summaryData = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const logLines = logContent.split('\n');
    
    // Récupérer les logs d'audit
    const auditLogs = await logger.getAuditLogs();
    
    // Analyser les logs pour extraire des informations utiles
    const timingData = extractTimingData(logLines, summaryData);
    const errorAnalysis = analyzeErrors(summaryData.errors, auditLogs);
    const accountAnalysis = analyzeAccounts(summaryData.accounts, auditLogs);
    const captchaAnalysis = analyzeCaptchas(auditLogs);
    const proxyAnalysis = analyzeProxyUsage(auditLogs);
    const recommendations = generateRecommendations(errorAnalysis, accountAnalysis, captchaAnalysis, proxyAnalysis);

    // Génération de données pour graphiques
    const chartData = {
      accountCreationSuccess: {
        labels: ["Succès", "Échecs"],
        values: [summaryData.accountsCreated, summaryData.accountsCreated < 10 ? 10 - summaryData.accountsCreated : 0]
      },
      reviewPostingSuccess: {
        labels: ["Publiés", "Échoués", "En attente"],
        values: [
          summaryData.reviewsPosted, 
          summaryData.reviewsFailed,
          10 - summaryData.reviewsPosted - summaryData.reviewsFailed
        ]
      },
      captchaResolution: {
        labels: ["Résolus", "Échoués"],
        values: [
          summaryData.captchaSolved,
          summaryData.captchaEncountered - summaryData.captchaSolved
        ]
      },
      errorCategories: errorAnalysis.categories,
      timings: timingData
    };

    // Enregistrer les données pour graphiques
    fs.writeFileSync(CHART_DATA_FILE, JSON.stringify(chartData, null, 2), 'utf8');
    
    // Créer le contenu du rapport Markdown
    const reportContent = `# Rapport Détaillé des Tests de ReviewFlow Automator

## Résumé Exécutif

Test effectué le: ${new Date(summaryData.startTime).toLocaleString()}  
Durée totale: ${formatDuration(summaryData.duration)}

${generateExecutiveSummary(summaryData)}

## Détails des Performances

### Création de Comptes
- **Comptes créés**: ${summaryData.accountsCreated}/10 (${calculatePercentage(summaryData.accountsCreated, 10)}%)
- **Comptes correctement chiffrés**: ${summaryData.accountsVerified}/${summaryData.accountsCreated} (${calculatePercentage(summaryData.accountsVerified, summaryData.accountsCreated)}%)
- **Temps moyen de création**: ${timingData.averageAccountCreationTime.toFixed(2)} secondes
- **Comptes avec IP correctement associée**: ${accountAnalysis.accountsWithIp}/${summaryData.accountsCreated} (${calculatePercentage(accountAnalysis.accountsWithIp, summaryData.accountsCreated)}%)

### Publication d'Avis
- **Avis publiés**: ${summaryData.reviewsPosted}/10 (${calculatePercentage(summaryData.reviewsPosted, 10)}%)
- **Avis échoués**: ${summaryData.reviewsFailed}/10 (${calculatePercentage(summaryData.reviewsFailed, 10)}%)
- **Avis en attente**: ${10 - summaryData.reviewsPosted - summaryData.reviewsFailed}/10
- **Temps moyen de publication**: ${timingData.averageReviewPostingTime.toFixed(2)} secondes

### Gestion des CAPTCHA
- **CAPTCHA rencontrés**: ${summaryData.captchaEncountered}
- **CAPTCHA résolus**: ${summaryData.captchaSolved} (${calculatePercentage(summaryData.captchaSolved, summaryData.captchaEncountered || 1)}%)
- **Taux de résolution**: ${summaryData.captchaEncountered > 0 ? (summaryData.captchaSolved / summaryData.captchaEncountered * 100).toFixed(2) + '%' : 'N/A'}

### Rotation de Proxies
- **Rotations effectuées**: ${summaryData.proxyRotations}
- **Moyenne de rotations par compte**: ${(summaryData.proxyRotations / (summaryData.accountsCreated || 1)).toFixed(2)}
- **Proxies résidentiels utilisés**: ${proxyAnalysis.residentialProxiesUsed}
- **Proxies par pays**: ${formatProxyCountries(proxyAnalysis.proxyCountries)}

## Analyse des Erreurs

${formatErrorAnalysis(errorAnalysis)}

## Respect des Délais
${formatTimingAnalysis(timingData)}

## Recommandations

${formatRecommendations(recommendations)}

## Détails par Compte

${formatAccountDetails(summaryData.accounts)}

## Conclusion

${generateConclusion(summaryData, errorAnalysis, recommendations)}

---
*Rapport généré automatiquement le ${new Date().toLocaleString()}*
`;

    // Enregistrer le rapport détaillé
    fs.writeFileSync(DETAILED_REPORT_FILE, reportContent, 'utf8');
    
    console.log(`Rapport détaillé généré avec succès: ${DETAILED_REPORT_FILE}`);
    console.log(`Données pour graphiques générées: ${CHART_DATA_FILE}`);
    
    return {
      reportFile: DETAILED_REPORT_FILE,
      chartDataFile: CHART_DATA_FILE,
      success: true
    };
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      success: false
    };
  }
}

// Formatage du résumé exécutif
function generateExecutiveSummary(summaryData: any): string {
  const statusEmoji = summaryData.isSuccess ? '✅' : '❌';
  let statusText = '';
  
  if (summaryData.accountsCreated === 0) {
    statusText = "🔴 ÉCHEC CRITIQUE - Aucun compte n'a pu être créé";
  } else if (summaryData.accountsCreated < 5) {
    statusText = "🟠 RÉSULTATS INSUFFISANTS - Moins de 50% des comptes ont été créés avec succès";
  } else if (summaryData.reviewsPosted === 0) {
    statusText = "🟠 ÉCHEC PARTIEL - Comptes créés mais aucun avis publié";
  } else if (summaryData.reviewsPosted < 5) {
    statusText = "🟡 RÉSULTATS MIXTES - Moins de 50% des avis ont été publiés avec succès";
  } else if (summaryData.accountsCreated >= 8 && summaryData.reviewsPosted >= 8) {
    statusText = "🟢 SUCCÈS - Plus de 80% des opérations réussies";
  } else {
    statusText = "🟢 RÉSULTATS ACCEPTABLES - La majorité des opérations ont réussi";
  }
  
  return `${statusEmoji} **Statut Global: ${statusText}**

Ce test a tenté de créer 10 comptes et de publier 10 avis sur la plateforme Google. 
${summaryData.accountsCreated} comptes ont été créés avec succès (${calculatePercentage(summaryData.accountsCreated, 10)}%) 
et ${summaryData.reviewsPosted} avis ont été publiés avec succès (${calculatePercentage(summaryData.reviewsPosted, 10)}%).

Le système a rencontré ${summaryData.errors.length} erreurs et a dû résoudre ${summaryData.captchaEncountered} CAPTCHAs 
avec un taux de réussite de ${summaryData.captchaEncountered > 0 ? (summaryData.captchaSolved / summaryData.captchaEncountered * 100).toFixed(2) : 'N/A'}%.`;
}

// Analyse des logs pour extraire les données temporelles
function extractTimingData(logLines: string[], summaryData: any): any {
  const accountCreationTimes: number[] = [];
  const reviewPostingTimes: number[] = [];
  const delaysBetweenOperations: number[] = [];
  
  // Extraction des timestamps de création de compte
  let lastCreationTime: Date | null = null;
  
  for (let i = 0; i < logLines.length; i++) {
    const line = logLines[i];
    
    // Extraction des timestamps depuis les logs
    const timestampMatch = line.match(/\[([^\]]+)\]/);
    if (!timestampMatch) continue;
    
    const timestamp = new Date(timestampMatch[1]);
    
    if (line.includes('Création du compte')) {
      if (lastCreationTime) {
        const timeBetweenCreations = (timestamp.getTime() - lastCreationTime.getTime()) / 1000;
        delaysBetweenOperations.push(timeBetweenCreations);
      }
      lastCreationTime = timestamp;
      
      // Chercher le log de fin de création correspondant
      for (let j = i + 1; j < logLines.length && j < i + 100; j++) {
        if (logLines[j].includes('Nouvelle compte créé avec succès') || 
            (logLines[j].includes('compte') && logLines[j].includes('créé'))) {
          const endTimestampMatch = logLines[j].match(/\[([^\]]+)\]/);
          if (endTimestampMatch) {
            const endTimestamp = new Date(endTimestampMatch[1]);
            const creationTime = (endTimestamp.getTime() - timestamp.getTime()) / 1000;
            accountCreationTimes.push(creationTime);
            break;
          }
        }
      }
    }
    
    // Traiter les temps de publication d'avis
    if (line.includes('Création de l\'avis')) {
      for (let j = i + 1; j < logLines.length && j < i + 100; j++) {
        if (logLines[j].includes('Avis') && logLines[j].includes('programmé pour publication')) {
          const endTimestampMatch = logLines[j].match(/\[([^\]]+)\]/);
          if (endTimestampMatch) {
            const endTimestamp = new Date(endTimestampMatch[1]);
            const postingTime = (endTimestamp.getTime() - timestamp.getTime()) / 1000;
            reviewPostingTimes.push(postingTime);
            break;
          }
        }
      }
    }
  }
  
  // Calcul des moyennes et valeurs remarquables
  const averageAccountCreationTime = accountCreationTimes.length > 0 
    ? accountCreationTimes.reduce((sum, time) => sum + time, 0) / accountCreationTimes.length 
    : 0;
    
  const averageReviewPostingTime = reviewPostingTimes.length > 0 
    ? reviewPostingTimes.reduce((sum, time) => sum + time, 0) / reviewPostingTimes.length 
    : 0;
    
  const averageDelayBetweenOperations = delaysBetweenOperations.length > 0 
    ? delaysBetweenOperations.reduce((sum, time) => sum + time, 0) / delaysBetweenOperations.length 
    : 0;
  
  // Évaluation de la conformité des délais
  const minDelayBetweenOperations = Math.min(...delaysBetweenOperations, Number.MAX_SAFE_INTEGER);
  const maxDelayBetweenOperations = Math.max(...delaysBetweenOperations, 0);
  
  const delayCompliance = {
    isCompliant: minDelayBetweenOperations >= 30, // Au moins 30 secondes entre les opérations
    averageDelay: averageDelayBetweenOperations,
    minDelay: minDelayBetweenOperations,
    maxDelay: maxDelayBetweenOperations,
    recommendation: ''
  };
  
  if (!delayCompliance.isCompliant) {
    delayCompliance.recommendation = 'Augmenter les délais minimums entre les opérations pour éviter la détection';
  } else if (averageDelayBetweenOperations > 300) { // Plus de 5 minutes en moyenne
    delayCompliance.recommendation = 'Les délais semblent excessivement longs, ce qui ralentit le traitement. Une optimisation pourrait être envisagée.';
  } else {
    delayCompliance.recommendation = 'Les délais entre opérations semblent appropriés.';
  }
  
  return {
    accountCreationTimes,
    reviewPostingTimes,
    delaysBetweenOperations,
    averageAccountCreationTime,
    averageReviewPostingTime,
    averageDelayBetweenOperations,
    delayCompliance,
    totalExecutionTime: summaryData.duration
  };
}

// Analyse des erreurs rencontrées
function analyzeErrors(errors: any[], auditLogs: string[]): any {
  if (!errors || errors.length === 0) {
    return {
      count: 0,
      categories: { "Aucune erreur": 100 },
      mostFrequent: "Aucune erreur",
      criticalErrors: [],
      patterns: [],
      recommendations: []
    };
  }
  
  // Catégoriser les erreurs
  const categories: Record<string, number> = {};
  const criticalErrors: any[] = [];
  
  errors.forEach(error => {
    // Déterminer la catégorie
    let category = 'Autre';
    
    if (error.message.includes('proxy') || error.message.includes('Proxy')) {
      category = 'Erreur de proxy';
    } else if (error.message.includes('captcha') || error.message.includes('CAPTCHA')) {
      category = 'Erreur de CAPTCHA';
    } else if (error.message.includes('auth') || error.message.includes('compte') || error.message.includes('bloqué')) {
      category = 'Erreur d\'authentification';
    } else if (error.message.includes('timeout') || error.message.includes('délai')) {
      category = 'Erreur de timeout';
    } else if (error.message.includes('chiffr') || error.message.includes('crypt')) {
      category = 'Erreur de chiffrement';
    } else if (error.message.includes('IP') || error.message.includes('ip')) {
      category = 'Erreur liée à l\'IP';
    }
    
    // Compter la catégorie
    categories[category] = (categories[category] || 0) + 1;
    
    // Détecter les erreurs critiques
    if (category === 'Erreur d\'authentification' || 
        error.message.includes('bloqué') || 
        error.message.includes('banned') ||
        error.message.includes('détecté')) {
      criticalErrors.push(error);
    }
  });
  
  // Calculer la distribution des catégories en pourcentage
  const totalErrors = errors.length;
  const categoriesPercentage: Record<string, number> = {};
  
  Object.entries(categories).forEach(([category, count]) => {
    categoriesPercentage[category] = Math.round((count / totalErrors) * 100);
  });
  
  // Identifier la catégorie la plus fréquente
  let mostFrequent = 'Autre';
  let maxCount = 0;
  
  Object.entries(categories).forEach(([category, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = category;
    }
  });
  
  // Analyser les patterns récurrents dans les erreurs
  const patterns: string[] = [];
  
  if (categories['Erreur de proxy'] > 1) {
    patterns.push('Problèmes récurrents avec les proxies');
  }
  
  if (categories['Erreur de CAPTCHA'] > 1) {
    patterns.push('Difficultés à résoudre les CAPTCHAs');
  }
  
  if (categories['Erreur d\'authentification'] > 1) {
    patterns.push('Problèmes d\'authentification récurrents');
  }
  
  // Proposer des recommandations
  const recommendations: string[] = [];
  
  Object.entries(categories).forEach(([category, count]) => {
    if (category === 'Erreur de proxy' && count > 1) {
      recommendations.push('Améliorer la sélection et la rotation des proxies');
      recommendations.push('Vérifier la qualité et la disponibilité des proxies résidentiels');
    } else if (category === 'Erreur de CAPTCHA' && count > 1) {
      recommendations.push('Améliorer le service de résolution de CAPTCHA');
      recommendations.push('Implémenter des délais supplémentaires avant de réessayer après un CAPTCHA');
    } else if (category === 'Erreur d\'authentification' && count > 1) {
      recommendations.push('Revoir le processus de création et d\'authentification des comptes');
      recommendations.push('Ajouter un mécanisme de récupération pour les comptes bloqués');
    } else if (category === 'Erreur de timeout' && count > 1) {
      recommendations.push('Augmenter les timeouts pour les opérations sensibles');
      recommendations.push('Implémenter une stratégie de retry avec backoff exponentiel');
    }
  });
  
  return {
    count: errors.length,
    categories: categoriesPercentage,
    mostFrequent,
    criticalErrors,
    patterns,
    recommendations
  };
}

// Analyse des comptes créés
function analyzeAccounts(accounts: any[], auditLogs: string[]): any {
  if (!accounts || accounts.length === 0) {
    return {
      count: 0,
      accountsWithIp: 0,
      loginSuccessRate: 0,
      encryptionRate: 0,
      postingSuccessRate: 0
    };
  }
  
  // Compter les comptes avec IP associée
  const accountsWithIp = accounts.filter(acc => acc.creationIp && acc.creationIp !== 'N/A').length;
  
  // Calculer le taux de chiffrement
  const encryptedAccounts = accounts.filter(acc => acc.isEncrypted).length;
  const encryptionRate = encryptedAccounts / accounts.length;
  
  // Calculer le taux de succès des connexions (à partir des logs)
  let loginAttempts = 0;
  let loginSuccesses = 0;
  
  auditLogs.forEach(log => {
    if (log.includes('login_attempt')) {
      loginAttempts++;
      
      if (log.includes('"status":"success"')) {
        loginSuccesses++;
      }
    }
  });
  
  const loginSuccessRate = loginAttempts > 0 ? loginSuccesses / loginAttempts : 0;
  
  // Calculer le taux de succès des publications d'avis
  const accountsWithPostedReview = accounts.filter(acc => acc.postedReview).length;
  const postingSuccessRate = accounts.length > 0 ? accountsWithPostedReview / accounts.length : 0;
  
  return {
    count: accounts.length,
    accountsWithIp,
    loginSuccessRate,
    encryptionRate,
    postingSuccessRate
  };
}

// Analyse des CAPTCHA
function analyzeCaptchas(auditLogs: string[]): any {
  let captchaEncountered = 0;
  let captchaSolved = 0;
  let solveAttempts: Record<string, { attempts: number, successes: number }> = {};
  
  auditLogs.forEach(log => {
    if (log.includes('captcha')) {
      if (log.includes('captcha_detected')) {
        captchaEncountered++;
        
        // Extraire la plateforme
        const platformMatch = log.match(/"platform":"([^"]+)"/);
        if (platformMatch) {
          const platform = platformMatch[1];
          
          if (!solveAttempts[platform]) {
            solveAttempts[platform] = { attempts: 0, successes: 0 };
          }
          
          solveAttempts[platform].attempts++;
        }
      }
      
      if (log.includes('captcha_solved')) {
        captchaSolved++;
        
        // Extraire la plateforme
        const platformMatch = log.match(/"platform":"([^"]+)"/);
        if (platformMatch) {
          const platform = platformMatch[1];
          
          if (!solveAttempts[platform]) {
            solveAttempts[platform] = { attempts: 0, successes: 0 };
          }
          
          solveAttempts[platform].successes++;
        }
      }
    }
  });
  
  // Calculer les taux de réussite par plateforme
  const platformSuccessRates: Record<string, number> = {};
  
  Object.entries(solveAttempts).forEach(([platform, stats]) => {
    platformSuccessRates[platform] = stats.attempts > 0 ? stats.successes / stats.attempts : 0;
  });
  
  return {
    captchaEncountered,
    captchaSolved,
    successRate: captchaEncountered > 0 ? captchaSolved / captchaEncountered : 0,
    platformStats: solveAttempts,
    platformSuccessRates
  };
}

// Analyse de l'utilisation des proxies
function analyzeProxyUsage(auditLogs: string[]): any {
  let proxyRotations = 0;
  let residentialProxiesUsed = 0;
  let proxyFailures = 0;
  let proxyCountries: Record<string, number> = {};
  
  auditLogs.forEach(log => {
    if (log.includes('proxy')) {
      if (log.includes('proxy_rotation')) {
        proxyRotations++;
      }
      
      if (log.includes('residential') && log.includes('proxy_used')) {
        residentialProxiesUsed++;
      }
      
      if (log.includes('proxy_failure') || log.includes('proxy') && log.includes('error')) {
        proxyFailures++;
      }
      
      // Extraire le pays du proxy
      const countryMatch = log.match(/"country":"([^"]+)"/);
      if (countryMatch) {
        const country = countryMatch[1];
        proxyCountries[country] = (proxyCountries[country] || 0) + 1;
      }
    }
  });
  
  return {
    proxyRotations,
    residentialProxiesUsed,
    proxyFailures,
    proxyCountries,
    failureRate: proxyRotations > 0 ? proxyFailures / proxyRotations : 0
  };
}

// Générer des recommandations en fonction des résultats
function generateRecommendations(
  errorAnalysis: any,
  accountAnalysis: any,
  captchaAnalysis: any,
  proxyAnalysis: any
): string[] {
  const recommendations: string[] = [];
  
  // Recommandations basées sur les erreurs
  if (errorAnalysis.count > 0) {
    recommendations.push(...errorAnalysis.recommendations);
  }
  
  // Recommandations sur les comptes
  if (accountAnalysis.encryptionRate < 1) {
    recommendations.push('Vérifier que tous les comptes sont correctement chiffrés avant d\'être stockés');
  }
  
  if (accountAnalysis.accountsWithIp < accountAnalysis.count) {
    recommendations.push('Améliorer l\'association des IPs aux comptes lors de la création');
  }
  
  // Recommandations sur les CAPTCHA
  if (captchaAnalysis.successRate < 0.8 && captchaAnalysis.captchaEncountered > 0) {
    recommendations.push('Améliorer le système de résolution des CAPTCHA, le taux de succès est inférieur à 80%');
  }
  
  // Recommandations sur les proxies
  if (proxyAnalysis.failureRate > 0.2) {
    recommendations.push('Améliorer la qualité et la fiabilité des proxies, le taux d\'échec est supérieur à 20%');
  }
  
  if (proxyAnalysis.residentialProxiesUsed < 10) {
    recommendations.push('Augmenter l\'utilisation de proxies résidentiels pour améliorer la crédibilité');
  }
  
  // Recommandations générales
  if (Object.keys(proxyAnalysis.proxyCountries).length < 3) {
    recommendations.push('Diversifier les pays d\'origine des proxies pour éviter les détections');
  }
  
  // Éliminer les doublons
  const uniqueRecommendations = [...new Set(recommendations)];
  
  return uniqueRecommendations;
}

// Fonction pour formater les recommendations
function formatRecommendations(recommendations: string[]): string {
  if (recommendations.length === 0) {
    return "Aucune recommandation spécifique n'a été identifiée. Le système semble fonctionner correctement.";
  }
  
  return recommendations.map(rec => `- ${rec}`).join('\n');
}

// Fonction pour formater l'analyse des erreurs
function formatErrorAnalysis(errorAnalysis: any): string {
  if (errorAnalysis.count === 0) {
    return "Aucune erreur n'a été détectée durant l'exécution du test.";
  }
  
  let result = `### Distribution des Erreurs\n\n`;
  
  Object.entries(errorAnalysis.categories).forEach(([category, percentage]) => {
    result += `- **${category}**: ${percentage}%\n`;
  });
  
  result += `\n### Erreurs Critiques\n\n`;
  
  if (errorAnalysis.criticalErrors.length === 0) {
    result += "Aucune erreur critique n'a été détectée.\n";
  } else {
    errorAnalysis.criticalErrors.forEach((error: any, index: number) => {
      result += `${index + 1}. **${error.step}**: ${error.message}\n`;
    });
  }
  
  result += `\n### Patterns Détectés\n\n`;
  
  if (errorAnalysis.patterns.length === 0) {
    result += "Aucun pattern récurrent n'a été détecté dans les erreurs.\n";
  } else {
    errorAnalysis.patterns.forEach((pattern: string, index: number) => {
      result += `${index + 1}. ${pattern}\n`;
    });
  }
  
  return result;
}

// Fonction pour formater l'analyse des délais
function formatTimingAnalysis(timingData: any): string {
  let result = '';
  
  result += `### Délais entre Opérations\n\n`;
  result += `- **Délai moyen entre les opérations**: ${timingData.averageDelayBetweenOperations.toFixed(2)} secondes\n`;
  result += `- **Délai minimum observé**: ${timingData.delayCompliance.minDelay.toFixed(2)} secondes\n`;
  result += `- **Délai maximum observé**: ${timingData.delayCompliance.maxDelay.toFixed(2)} secondes\n`;
  
  result += `\n### Évaluation de la Conformité\n\n`;
  
  if (timingData.delayCompliance.isCompliant) {
    result += `✅ **Les délais sont conformes aux exigences** - Les délais entre opérations sont suffisants pour éviter la détection.\n`;
  } else {
    result += `❌ **Les délais ne sont pas conformes aux exigences** - Certains délais sont trop courts, ce qui pourrait augmenter le risque de détection.\n`;
  }
  
  result += `\n### Recommandation sur les Délais\n\n`;
  result += timingData.delayCompliance.recommendation;
  
  return result;
}

// Fonction pour formater les détails des comptes
function formatAccountDetails(accounts: any[]): string {
  if (!accounts || accounts.length === 0) {
    return "Aucun compte n'a été créé durant le test.";
  }
  
  let result = '';
  
  accounts.forEach((account, index) => {
    result += `### Compte #${index + 1}: ${account.email}\n\n`;
    result += `- **ID**: ${account.id}\n`;
    result += `- **Plateforme**: ${account.platform}\n`;
    result += `- **Statut**: ${account.status}\n`;
    result += `- **Chiffrement**: ${account.isEncrypted ? '✅ Oui' : '❌ Non'}\n`;
    result += `- **IP de création**: ${account.creationIp || 'N/A'}\n`;
    result += `- **Avis publié**: ${account.postedReview ? '✅ Oui' : '❌ Non'}\n`;
    
    if (account.logs && account.logs.length > 0) {
      result += `\n**Derniers logs**:\n\`\`\`\n${account.logs.join('\n')}\n\`\`\`\n`;
    }
    
    result += '\n';
  });
  
  return result;
}

// Fonction pour générer la conclusion
function generateConclusion(summaryData: any, errorAnalysis: any, recommendations: string[]): string {
  let result = '';
  
  if (summaryData.isSuccess) {
    result += `Le test a globalement été un succès avec **${summaryData.accountsCreated}** comptes créés et **${summaryData.reviewsPosted}** avis publiés avec succès. `;
  } else {
    result += `Le test a rencontré des difficultés significatives avec seulement **${summaryData.accountsCreated}** comptes créés et **${summaryData.reviewsPosted}** avis publiés avec succès. `;
  }
  
  if (errorAnalysis.count > 0) {
    result += `Au total, **${errorAnalysis.count}** erreurs ont été rencontrées, principalement de type **${errorAnalysis.mostFrequent}**. `;
  } else {
    result += `Aucune erreur n'a été rencontrée durant l'exécution. `;
  }
  
  if (recommendations.length > 0) {
    result += `\n\nAvant de passer à une échelle plus large (100 comptes), il est recommandé d'adresser les **${recommendations.length}** points d'amélioration identifiés dans ce rapport.`;
  } else {
    result += `\n\nLe système semble prêt pour passer à une échelle plus large (100 comptes) sans modifications significatives nécessaires.`;
  }
  
  return result;
}

// Fonction utilitaire pour calculer un pourcentage
function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Fonction utilitaire pour formater un nombre de secondes en durée lisible
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} secondes`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} et ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return `${hours} heure${hours > 1 ? 's' : ''} et ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
}

// Fonction utilitaire pour formater les pays des proxies
function formatProxyCountries(countries: Record<string, number>): string {
  if (Object.keys(countries).length === 0) {
    return 'Aucune information de pays';
  }
  
  return Object.entries(countries)
    .map(([country, count]) => `${country} (${count})`)
    .join(', ');
}

// Point d'entrée du script en tant que module ES
generateDetailedReport()
  .then(result => {
    if (result.success) {
      console.log(`\nRapport détaillé généré avec succès: ${result.reportFile}`);
      process.exit(0);
    } else {
      console.error(`\nErreur lors de la génération du rapport: ${result.error}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

// Exporter pour utilisation par d'autres modules
export { generateDetailedReport };