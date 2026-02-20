const { estimateRequirements } = require('./AIEstimationEngine.js');

async function runTests() {
    console.log("=========================================");
    console.log("Running AI Estimation Engine Tests...");
    console.log("=========================================\n");

    const testCases = [
        "There is a small pothole on main street that needs patching.",
        "Massive cleanup required at the local park. Lots of heavy debris after the storm.",
        "Quick fix needed for a broken park bench.",
        "We need to paint 5 pedestrian crossings in the downtown area, it's a huge project."
    ];

    for (const testCase of testCases) {
        console.log(`Description: "${testCase}"`);
        const result = await estimateRequirements(testCase);
        console.log(`Estimation:`, result);
        console.log("-".repeat(40));
    }
}

runTests();
