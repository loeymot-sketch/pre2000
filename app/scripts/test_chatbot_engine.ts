import { KeywordEngine } from '../src/services/chatbot/engines/KeywordEngine';
import { createLogger } from '../src/utils/logger';

// Mock logger to avoid console noise during test
const log = createLogger('TestEngine');

const runTests = () => {
    console.log("🚀 Starting Chatbot Engine Tests...\n");

    // Initialize engine with some test vocabulary
    const vocabulary = ['grossesse', 'fièvre', 'tête', 'ventre', 'saignement', 'nausée'];
    const engine = new KeywordEngine(vocabulary);

    const testCases = [
        {
            name: "Basic Match",
            input: "J'ai de la fièvre",
            expectedPositive: ['fièvre'],
            expectedNegative: []
        },
        {
            name: "Fuzzy Match (Typo)",
            input: "J'ai de la fiévre et mal au crâne", // fiévre -> fièvre
            expectedPositive: ['fièvre', 'tête'], // crâne -> tête (synonym)
            expectedNegative: []
        },
        {
            name: "Negation",
            input: "Je n'ai pas de fièvre",
            expectedPositive: [],
            expectedNegative: ['fièvre']
        },
        {
            name: "Complex Negation",
            input: "Je n'ai pas de fièvre mais j'ai mal au ventre",
            expectedPositive: ['ventre'],
            expectedNegative: ['fièvre']
        },
        {
            name: "Synonym Expansion",
            input: "J'ai mal au bidou",
            expectedPositive: ['ventre'], // bidou -> ventre
            expectedNegative: []
        },
        {
            name: "Multiple Typos",
            input: "grosesse et nausé", // grosesse -> grossesse, nausé -> nausée
            expectedPositive: ['grossesse', 'nausée'],
            expectedNegative: []
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach((test: any, index: any) => {
        console.log(`Test ${index + 1}: ${test.name}`);
        console.log(`Input: "${test.input}"`);

        const result = engine.processQuery(test.input);

        // Simple arrays of keywords, checking if all expected are included in results
        const positiveMatch = test.expectedPositive.every((w: any) => result.positive.includes(w));
        const negativeMatch = test.expectedNegative.every((w: any) => result.negative.includes(w));

        if (positiveMatch && negativeMatch) {
            console.log("✅ PASSED");
            passed++;
        } else {
            console.log("❌ FAILED");
            console.log("Expected Positive:", test.expectedPositive);
            console.log("Got Positive:", result.positive);
            console.log("Expected Negative:", test.expectedNegative);
            console.log("Got Negative:", result.negative);
            failed++;
        }
        console.log("-----------------------------------");
    });

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
};

runTests();
