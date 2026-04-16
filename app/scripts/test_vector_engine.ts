import { VectorEngine } from '../src/services/chatbot/engines/VectorEngine';

// Test data simulating articles
const testDocuments = [
    { id: 'art1', title: 'Alimentation pendant la grossesse', content: 'Manger sainement est essentiel pour le développement du bébé. Évitez les aliments crus et le fromage non pasteurisé.' },
    { id: 'art2', title: 'Gérer les nausées matinales', content: 'Les nausées sont courantes au premier trimestre. Essayez de manger de petits repas fréquents et évitez les odeurs fortes.' },
    { id: 'art3', title: 'Le sommeil pendant la grossesse', content: 'Dormir suffisamment est important. Utilisez un coussin de maternité et dormez sur le côté gauche.' },
    { id: 'art4', title: 'Exercice physique adapté', content: 'La marche, le yoga prénatal et la natation sont recommandés. Évitez les sports à risque de chute.' },
    { id: 'art5', title: 'Dépression et anxiété prénatale', content: 'Il est normal de se sentir triste ou inquiète parfois. Parlez à votre médecin si ces sentiments persistent. Le baby blues est différent de la dépression.' },
];

const runTests = () => {
    console.log('🚀 Starting VectorEngine Tests...\n');

    const engine = new VectorEngine();
    engine.indexDocuments(testDocuments);

    const testQueries = [
        { query: "J'ai des nausées le matin", expected: 'art2' },
        { query: "Que puis-je manger enceinte?", expected: 'art1' },
        { query: "Je n'arrive pas à dormir", expected: 'art3' },
        { query: "Je me sens triste et j'ai le cafard", expected: 'art5' }, // Semantic understanding
        { query: "Quel sport faire enceinte?", expected: 'art4' },
        { query: "J'ai peur pour mon bébé", expected: 'art5' }, // Anxiety related
    ];

    let passed = 0;
    let failed = 0;

    testQueries.forEach((test: any, i: any) => {
        console.log(`Test ${i + 1}: "${test.query}"`);
        const results = engine.search(test.query, 3);

        if (results.length > 0) {
            console.log(`  Top Result: ${results[0].title} (score: ${results[0].score.toFixed(3)})`);
            if (results[0].id === test.expected) {
                console.log('  ✅ PASSED');
                passed++;
            } else {
                console.log(`  ❌ FAILED - Expected: ${test.expected}, Got: ${results[0].id}`);
                failed++;
            }
        } else {
            console.log('  ❌ FAILED - No results');
            failed++;
        }
        console.log('---');
    });

    console.log(`\nResults: ${passed}/${testQueries.length} Passed`);
};

runTests();
