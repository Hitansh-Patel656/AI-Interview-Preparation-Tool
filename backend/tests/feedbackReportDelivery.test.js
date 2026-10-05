"use strict";

const assert = require("assert");
const mongoose = require("mongoose");
const { getFeedbackReportBySession } = require("../controllers/feedbackReportController");
const FeedbackReport = require("../models/FeedbackReport");
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const DeliveryMetrics = require("../models/DeliveryMetrics");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");

// Mock auth
const authUtils = require("../utils/authUtils");
authUtils.verifySessionOwner = async () => true;
authUtils.verifyQuestionOwner = async () => true;
authUtils.verifyAnswerOwner = async () => true;

async function runTests() {
    console.log("Running Feedback Report Delivery Metrics Integration Test...");
    
    const uri = "mongodb://127.0.0.1:27017/ai_interview_test_delivery";
    await mongoose.connect(uri);

    await InterviewSession.deleteMany({});
    await Question.deleteMany({});
    await Answer.deleteMany({});
    await DeliveryMetrics.deleteMany({});
    await ContentRelevanceScore.deleteMany({});

    try {
        const userId = "test-user-id";
        
        const session = await InterviewSession.create({
            user_id: userId,
            role: "Software Engineer",
            interview_type: "Technical",
            status: "completed"
        });

        const question = await Question.create({
            session_id: session._id,
            text: "Tell me about yourself"
        });

        const answer = await Answer.create({
            question_id: question._id,
            transcript: "um actually I am a developer"
        });

        await DeliveryMetrics.create({
            answer_id: answer._id,
            pace_wpm: 120,
            filler_word_count: 2,
            tone: "Confident"
        });

        const req = {
            method: "GET",
            params: { sessionId: session._id },
            user: { id: userId }
        };

        let responseData = null;
        let statusCode = null;

        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                responseData = data;
            }
        };

        await getFeedbackReportBySession(req, res);

        assert.strictEqual(statusCode, 200, "Should return 200");
        assert.strictEqual(responseData.questions.length, 1, "Should have 1 question");
        assert.ok(responseData.questions[0].evaluation.delivery, "Delivery should exist");
        assert.strictEqual(responseData.questions[0].evaluation.delivery.pace_wpm, 120, "Pace should be 120");
        assert.strictEqual(responseData.questions[0].evaluation.delivery.filler_word_count, 2, "Filler words should be 2");
        assert.strictEqual(responseData.questions[0].evaluation.delivery.tone, "Confident", "Tone should be Confident");

        console.log("✅ Integration test passed!");
    } catch (e) {
        console.error("❌ Integration test failed");
        console.error(e);
        process.exit(1);
    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
}

runTests();
