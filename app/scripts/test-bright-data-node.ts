/**
 * Script de test pour vérifier le fonctionnement des proxies BrightData
 * en utilisant exactement le même code que dans l'exemple BrightData
 */

// Pour contourner les erreurs SSL dans l'environnement de test
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { HttpsProxyAgent } from 'https-proxy-agent';

(async() => {
  const url = 'https://geo.brdtest.com/mygeo.json';
  const proxy = 'http://brd-customer-hl_ab176a27-zone-residential_proxy1:y7z8all1x1u7@brd.superproxy.io:33335';
  const proxy_agent = new HttpsProxyAgent(proxy);
  
  console.log(`Test de connexion au proxy BrightData...`);
  console.log(`URL: ${url}`);
  console.log(`Proxy: ${proxy}`);
  
  try {
    const response = await fetch(url, {
      agent: proxy_agent,
    });
    
    console.log('\nResponse Headers:\n');
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
      console.log(`${name}: ${value}`);
    });
    
    if (response.ok) {
      const response_text = await response.text();
      console.log('\nResponse Body:\n');
      console.log(response_text);
      console.log('\nLe test a réussi ! Les proxies BrightData fonctionnent correctement.');
    } else {
      const errorBody = await response.text();
      throw new Error(
        `HTTP error: ${response.status} ${response.statusText}\n` +
        `Headers: ${JSON.stringify(headers, null, 2)}\n` +
        `Body: ${errorBody}`
      );
    }
  } catch(error) {
    console.error('\nError details:\n');
    console.error(error.message);
    if (error.cause) {
      console.error('\nCause:\n');
      console.error(error.cause);
    }
  }
})();