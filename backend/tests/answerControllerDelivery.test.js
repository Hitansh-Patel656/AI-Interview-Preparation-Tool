"use strict";

const assert = require("assert");
const mongoose = require("mongoose");
const { createAnswerForSession } = require("../controllers/answerController");
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const SttMetadata = require("../models/SttMetadata");
const DeliveryMetrics = require("../models/DeliveryMetrics");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const authUtils = require("../utils/authUtils");
const llmService = require("../services/llm/llmService");

authUtils.verifySessionOwner = async () => true;
authUtils.verifyQuestionOwner = async () => true;
authUtils.verifyAnswerOwner = async () => true;

// Mock AI evaluation to avoid actual network calls
llmService.generateStructured = async () => ({
    tone: "Confident",
    content_relevance_score: 90,
    content_relevance_notes: "Good",
    star_rating: 4,
    star_suggestions: "Use metrics",
    model_answer: "Ideal answer",
    follow_up_required: false,
    follow_up_reason: "None",
    follow_up_question: "None"
});

async function runTests() {
    console.log("Running Answer Controller Delivery Tests...");
    
    const uri = "mongodb://127.0.0.1:27017/ai_interview_test_answer_ctrl";
    await mongoose.connect(uri);

    await InterviewSession.deleteMany({});
    await Question.deleteMany({});
    await Answer.deleteMany({});
    await SttMetadata.deleteMany({});
    await DeliveryMetrics.deleteMany({});
    await ContentRelevanceScore.deleteMany({});

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

    const userId = "test-user-id";
    const session = await InterviewSession.create({
        user_id: userId,
        role: "Software Engineer",
        interview_type: "Technical",
        status: "in_progress"
    });

    const createReqRes = (body) => {
        const req = {
            method: "POST",
            params: { id: session._id.toString() },
            user: { id: userId },
            body
        };
        let statusCode = null;
        let responseData = null;
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { responseData = data; }
        };
        return { req, res, getStatus: () => statusCode, getData: () => responseData };
    };

    await runTest("9 & 10. Client duration cannot override server duration & pace uses authoritative", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q1" });
        const audioUrl = `/uploads/audio/server-auth-${Date.now()}.webm`;
        
        // 1. Setup authoritative server-side duration in SttMetadata (e.g. 10 seconds)
        await SttMetadata.create({ audio_url: audioUrl, duration_seconds: 10 });

        // 2. Client sends malicious duration (e.g. 0.0001)
        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript with four words",
            audio_url: audioUrl,
            duration_seconds: 0.0001
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 201);
        
        const answerId = getData().answer.id;
        const answer = await Answer.findById(answerId);
        
        // Duration MUST be 10 (server auth), not 0.0001
        assert.strictEqual(answer.duration_seconds, 10);
        
        const delivery = await DeliveryMetrics.findOne({ answer_id: answer._id });
        // Pace should be: (5 words / 10s) * 60 = 30 wpm. (If duration was 0.0001, pace would be 3000000)
        assert.strictEqual(delivery.pace_wpm, 30);
    });

    await runTest("Client untrusted duration is validated strictly if server duration is missing", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q2" });
        const audioUrl = `/uploads/audio/client-only-${Date.now()}.webm`;
        
        // No server duration setup.
        
        // Client sends malicious duration
        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript",
            audio_url: audioUrl,
            duration_seconds: -5
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 201);
        
        const answer = await Answer.findById(getData().answer.id);
        
        // -5 is invalid, so it falls back to 0.
        assert.strictEqual(answer.duration_seconds, 0);
        
        const delivery = await DeliveryMetrics.findOne({ answer_id: answer._id });
        // Pace should be 0, not negative
        assert.strictEqual(delivery.pace_wpm, 0);
    });

    console.log(`\nTests completed: ${testsPassed} passed, ${testsFailed} failed`);
    
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runTests();
