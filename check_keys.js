const fs = require('fs');
const langs = ['fr', 'en', 'ar', 'tn'];

const keysToCheck = [
  'common.searchArticlePlaceholder',
  'common.seeMore',
  'common.seeDetails',
  'common.errorBoundary.title',
  'common.errorBoundary.message',
  'common.errorBoundary.retry',
  'common.noResultsFor',
  'common.relatedSupplements',
  'common.loading',
  'common.noDataAvailable',
  'common.safetyOk',
  'common.safetyMonitor',
  'common.safetyNotRecommended',
  'common.searchSupplement',
  'common.noSupplementFound',
  'common.supplementNotSpecified',
  'common.supplementNotFound',
  'common.supplementSafety.safe',
  'common.supplementSafety.caution',
  'common.supplementSafety.avoid',
  'common.supplementSafety.unknown',
  'common.about',
  'common.typicalDose',
  'common.precautions',
  'common.source',
  'article.preview',
  'article.contentComingSoon',
  'article.errorSpecified',
  'article.notFound',
  'categories.nutrition',
  'categories.examens',
  'categories.sante',
  'categories.developpement',
  'categories.preparation',
  'categories.lifestyle',
  'categories.administratif',
  'categories.medical'
];

langs.forEach(lang => {
  let common = {};
  let article = {};
  
  try { common = JSON.parse(fs.readFileSync('./app/src/i18n/locales/' + lang + '/common.json')); } catch(e){}
  try { article = JSON.parse(fs.readFileSync('./app/src/i18n/locales/' + lang + '/article.json')); } catch(e){}
  
  let missing = [];
  keysToCheck.forEach(k => {
    let parts = k.split('.');
    let obj = null;
    let found = true;
    
    if (parts[0] === 'article') {
       obj = article;
       parts.shift();
    } else if (parts[0] === 'categories' || parts[0] === 'common') {
       obj = common;
       if (parts[0] === 'common') parts.shift();
    }
    
    for (const p of parts) {
      if (obj && obj[p]) {
        obj = obj[p];
      } else {
        found = false;
        break;
      }
    }
    if (!found) missing.push(k);
  });
  console.log(`Language ${lang} missing ${missing.length} keys:`, missing);
});
