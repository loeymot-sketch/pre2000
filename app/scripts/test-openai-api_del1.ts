/**
 * Script de test pour vérifier que l'API OpenAI fonctionne correctement
 */

import OpenAI from 'openai';
import * as fs from 'fs';

async function testOpenAI() {
  try {
    console.log("Test de l'API OpenAI...");
    
    // Vérifier que la clé API est définie
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("La clé API OpenAI n'est pas définie dans les variables d'environnement (OPENAI_API_KEY)");
    }
    
    console.log(`La clé API est définie et commence par: ${apiKey.substring(0, 5)}...`);
    
    // Initialiser l'API OpenAI
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Faire une requête simple pour tester
    console.log("Envoi d'une requête de test à l'API OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Provide a short response in French."
        },
        {
          role: "user",
          content: "Est-ce que l'API fonctionne correctement?"
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });
    
    // Afficher la réponse
    const answer = response.choices[0].message.content;
    console.log("\n=== Réponse de l'API OpenAI ===");
    console.log(answer);
    console.log("\n✅ L'API OpenAI fonctionne correctement");
    
    // Sauvegarder le résultat dans un fichier pour référence
    fs.writeFileSync('openai-test-result.json', JSON.stringify(response, null, 2));
    console.log("Résultat complet sauvegardé dans openai-test-result.json");
    
    return true;
  } catch (error) {
    console.error("\n❌ Erreur lors du test de l'API OpenAI:", error);
    return false;
  }
}

// Exécuter le test
testOpenAI()
  .then(success => {
    if (success) {
      console.log("Le test de l'API OpenAI a réussi.");
    } else {
      console.error("Le test de l'API OpenAI a échoué.");
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Erreur inattendue:", error);
    process.exit(1);
  });