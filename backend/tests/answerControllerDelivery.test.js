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

    const createReqRes = (body, specificUserId = userId) => {
        const req = {
            method: "POST",
            params: { id: session._id.toString() },
            user: { id: specificUserId },
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

    await runTest("valid authoritative duration -> correct Answer.duration_seconds and WPM", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q1" });
        const audioUrl = `/uploads/audio/valid-${Date.now()}.webm`;

        await SttMetadata.create({ audio_url: audioUrl, duration_seconds: 10, user_id: userId });

        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript with four words",
            audio_url: audioUrl
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 201);

        const answer = await Answer.findById(getData().answer.id);
        assert.strictEqual(answer.duration_seconds, 10);

        const delivery = await DeliveryMetrics.findOne({ answer_id: answer._id });
        assert.strictEqual(delivery.pace_wpm, 30); // (5 / 10) * 60
    });

    await runTest("client sends 0.0001 while authoritative duration is 10 -> stored/used duration remains 10", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q2" });
        const audioUrl = `/uploads/audio/malicious-small-${Date.now()}.webm`;

        await SttMetadata.create({ audio_url: audioUrl, duration_seconds: 10, user_id: userId });

        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript with four words",
            audio_url: audioUrl,
            duration_seconds: 0.0001
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 201);
        const answer = await Answer.findById(getData().answer.id);
        assert.strictEqual(answer.duration_seconds, 10);
    });

    await runTest("client sends 7200 while authoritative duration is 10 -> stored/used duration remains 10", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q3" });
        const audioUrl = `/uploads/audio/malicious-large-${Date.now()}.webm`;

        await SttMetadata.create({ audio_url: audioUrl, duration_seconds: 10, user_id: userId });

        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript with four words",
            audio_url: audioUrl,
            duration_seconds: 7200
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 201);
        const answer = await Answer.findById(getData().answer.id);
        assert.strictEqual(answer.duration_seconds, 10);
    });

    await runTest("client sends NaN/Infinity/string -> cannot influence authoritative duration", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q4" });
        const audioUrl = `/uploads/audio/malicious-nan-${Date.now()}.webm`;

        await SttMetadata.create({ audio_url: audioUrl, duration_seconds: 10, user_id: userId });

        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript with four words",
            audio_url: audioUrl,
            duration_seconds: "invalid"
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 201);
        const answer = await Answer.findById(getData().answer.id);
        assert.strictEqual(answer.duration_seconds, 10);
    });

    await runTest("SttMetadata missing + malicious client duration 0.0001 -> request fails (400)", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q5" });
        const audioUrl = `/uploads/audio/missing-small-${Date.now()}.webm`;

        const { req, res, getStatus } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript",
            audio_url: audioUrl,
            duration_seconds: 0.0001
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 400);
    });

    await runTest("SttMetadata missing + malicious client duration 7200 -> request fails (400)", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q6" });
        const audioUrl = `/uploads/audio/missing-large-${Date.now()}.webm`;

        const { req, res, getStatus } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript",
            audio_url: audioUrl,
            duration_seconds: 7200
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 400);
    });

    await runTest("no authoritative duration -> request follows the defined controlled failure path", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q7" });
        const audioUrl = `/uploads/audio/missing-none-${Date.now()}.webm`;

        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript",
            audio_url: audioUrl
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 400);
        assert.strictEqual(getData().message, "Authoritative STT metadata is unavailable or unauthorized for this audio submission.");
    });

    await runTest("cross-user audio_url/SttMetadata access is rejected", async () => {
        const question = await Question.create({ session_id: session._id, text: "Q8" });
        const audioUrl = `/uploads/audio/cross-user-${Date.now()}.webm`;

        // Another user created the SttMetadata
        await SttMetadata.create({ audio_url: audioUrl, duration_seconds: 10, user_id: "other-user-id" });

        // Our test user tries to claim it
        const { req, res, getStatus, getData } = createReqRes({
            question_id: question._id.toString(),
            transcript: "test transcript",
            audio_url: audioUrl
        });

        await createAnswerForSession(req, res);
        assert.strictEqual(getStatus(), 400);
        assert.strictEqual(getData().message, "Authoritative STT metadata is unavailable or unauthorized for this audio submission.");
    });

    console.log(`\nTests completed: ${testsPassed} passed, ${testsFailed} failed`);

    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runTests();
