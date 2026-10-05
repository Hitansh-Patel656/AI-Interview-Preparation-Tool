"use strict";

const assert = require("assert");
const { evaluateDelivery } = require("../services/delivery/deliveryEvaluator");
const llmService = require("../services/llm/llmService");

// Mock llmService
const originalGenerateStructured = llmService.generateStructured;

async function runTests() {
    console.log("Running Delivery Evaluator Tests...");

    let testsPassed = 0;
    let testsFailed = 0;

    const runTest = async (name, testFn) => {
        try {
            await testFn();
            console.log(`✅ ${name}`);
            testsPassed++;
        } catch (error) {
            console.error(`❌ ${name}`);
            console.error(error);
            testsFailed++;
        }
    };

    llmService.generateStructured = async (prompt, schema) => {
        if (prompt.includes("FAIL_AI")) {
            throw new Error("Simulated LLM failure");
        }
        if (prompt.includes("MALFORMED")) {
            return { weird_key: "Confident" }; // Invalid schema
        }
        if (prompt.includes("NERVOUS_TEXT")) {
            return { tone: "Nervous" };
        }
        return { tone: "Confident" };
    };

    await runTest("1. Valid deterministic calculation (wpm & fillers)", async () => {
        // 12 words. Duration 4 seconds. Pace = (12/4)*60 = 180 wpm
        // Fillers: um, like, basically, you know (4 fillers)
        const transcript = "um I like basically think that you know it is very good";
        const result = await evaluateDelivery({ transcript, duration_seconds: 4 });
        
        assert.strictEqual(result.pace_wpm, 180);
        assert.strictEqual(result.filler_word_count, 4);
        assert.strictEqual(result.tone, "Confident");
    });

    await runTest("2. Missing duration (fallback to 0 pace)", async () => {
        const transcript = "this is a test";
        const result = await evaluateDelivery({ transcript, duration_seconds: 0 });
        assert.strictEqual(result.pace_wpm, 0);
        assert.strictEqual(result.filler_word_count, 0);
    });

    await runTest("3. Empty transcript", async () => {
        const transcript = "   ";
        const result = await evaluateDelivery({ transcript, duration_seconds: 10 });
        assert.strictEqual(result.pace_wpm, 0);
        assert.strictEqual(result.filler_word_count, 0);
        assert.strictEqual(result.tone, "Neutral");
    });

    await runTest("4. Upstream AI failure handled gracefully", async () => {
        const transcript = "FAIL_AI test";
        const result = await evaluateDelivery({ transcript, duration_seconds: 5 });
        assert.strictEqual(result.tone, "Unclear");
    });

    await runTest("5. Malformed LLM output handled gracefully", async () => {
        const transcript = "MALFORMED output";
        const result = await evaluateDelivery({ transcript, duration_seconds: 5 });
        assert.strictEqual(result.tone, "Unclear");
    });

    await runTest("6. Tone evaluation maps correctly", async () => {
        const transcript = "NERVOUS_TEXT";
        const result = await evaluateDelivery({ transcript, duration_seconds: 5 });
        assert.strictEqual(result.tone, "Nervous");
    });

    console.log(`\nTests completed: ${testsPassed} passed, ${testsFailed} failed`);
    
    // Restore
    llmService.generateStructured = originalGenerateStructured;

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runTests();
