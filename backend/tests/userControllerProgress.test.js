"use strict";
require("dotenv").config();

const assert = require("assert");
const mongoose = require("mongoose");
const { getProgress } = require("../controllers/userController");
const { pool } = require("../config/postgres");
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const DeliveryMetrics = require("../models/DeliveryMetrics");

async function runTests() {
    console.log("Running Progress Dashboard Tests...");
    
    // Connect to test MongoDB
    const uri = "mongodb://127.0.0.1:27017/ai_interview_test_progress";
    await mongoose.connect(uri);

    await InterviewSession.deleteMany({});
    await Question.deleteMany({});
    await Answer.deleteMany({});
    await DeliveryMetrics.deleteMany({});

    // Cleanup PostgreSQL
    await pool.query("DELETE FROM outcomes");
    await pool.query("DELETE FROM users WHERE email LIKE 'progress_test_%'");

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

    // Create a test user in Postgres
    const userRes = await pool.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
        ["Test User", "progress_test_1@example.com"]
    );
    const userId = userRes.rows[0].id;
    
    const otherUserRes = await pool.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
        ["Other User", "progress_test_other@example.com"]
    );
    const otherUserId = otherUserRes.rows[0].id;

    const createReqRes = (uid) => {
        const req = { user: { id: uid } };
        let statusCode = null;
        let responseData = null;
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { responseData = data; }
        };
        return { req, res, getStatus: () => statusCode, getData: () => responseData };
    };

    // Seed Data
    // Session 1 (User 1) - Complete with 2 answers
    const s1 = await InterviewSession.create({ user_id: userId, role: "SE", interview_type: "Technical", status: "completed" });
    const q1 = await Question.create({ session_id: s1._id, text: "Q1" });
    const q2 = await Question.create({ session_id: s1._id, text: "Q2" });
    const a1 = await Answer.create({ question_id: q1._id, transcript: "A1" });
    const a2 = await Answer.create({ question_id: q2._id, transcript: "A2" });
    await DeliveryMetrics.create({ answer_id: a1._id, pace_wpm: 120, filler_word_count: 5, tone: "neutral" });
    await DeliveryMetrics.create({ answer_id: a2._id, pace_wpm: 140, filler_word_count: 3, tone: "neutral" });
    // Postgres Outcome S1
    await pool.query(`
        INSERT INTO outcomes (user_id, session_id, role, interview_type, overall_score, content_relevance_score, star_compliance_score, completed_at)
        VALUES ($1, $2, 'SE', 'Technical', 85, 80, 90, '2026-10-01T10:00:00Z')
    `, [userId, s1._id.toString()]);


    // Session 2 (User 1) - Complete with 1 answer, missing STAR/Content, missing pace
    const s2 = await InterviewSession.create({ user_id: userId, role: "SE", interview_type: "Technical", status: "completed" });
    const q3 = await Question.create({ session_id: s2._id, text: "Q3" });
    const a3 = await Answer.create({ question_id: q3._id, transcript: "A3" });
    await DeliveryMetrics.create({ answer_id: a3._id, pace_wpm: 0, filler_word_count: 10, tone: "neutral" });
    // Postgres Outcome S2
    await pool.query(`
        INSERT INTO outcomes (user_id, session_id, role, interview_type, overall_score, content_relevance_score, star_compliance_score, completed_at)
        VALUES ($1, $2, 'SE', 'Technical', 70, NULL, NULL, '2026-10-02T10:00:00Z')
    `, [userId, s2._id.toString()]);


    // Session 3 (Other User) - Should be isolated
    const s3 = await InterviewSession.create({ user_id: otherUserId, role: "SE", interview_type: "Technical", status: "completed" });
    await pool.query(`
        INSERT INTO outcomes (user_id, session_id, role, interview_type, overall_score, completed_at)
        VALUES ($1, $2, 'SE', 'Technical', 100, '2026-10-03T10:00:00Z')
    `, [otherUserId, s3._id.toString()]);

    
    // In-progress session (User 1) - Should be excluded because it has no outcome
    await InterviewSession.create({ user_id: userId, role: "SE", interview_type: "Technical", status: "in_progress" });


    await runTest("Fetches progress and constructs correct trends", async () => {
        const { req, res, getData } = createReqRes(userId);
        await getProgress(req, res);
        
        const data = getData();
        assert.ok(data);
        assert.strictEqual(data.stats.total_interviews, 2);
        
        assert.strictEqual(data.pace_trend.length, 1);
        assert.strictEqual(data.pace_trend[0].session_id, s1._id.toString());
        assert.strictEqual(data.pace_trend[0].value, 130); // (120+140)/2
        
        assert.strictEqual(data.filler_trend.length, 2);
        assert.strictEqual(data.filler_trend[0].value, 8); // 5+3
        assert.strictEqual(data.filler_trend[1].value, 10); // 10
        
        assert.strictEqual(data.star_trend.length, 1);
        assert.strictEqual(data.star_trend[0].value, 90);
        
        assert.strictEqual(data.content_trend.length, 1);
        assert.strictEqual(data.content_trend[0].value, 80);
    });

    await runTest("Isolation: another user's sessions/outcomes never appear", async () => {
        const { req, res, getData } = createReqRes(otherUserId);
        await getProgress(req, res);
        
        const data = getData();
        assert.strictEqual(data.stats.total_interviews, 1);
        assert.strictEqual(data.sessions[0].session_id, s3._id.toString());
        assert.strictEqual(data.pace_trend.length, 0);
    });
    
    await runTest("Empty history returns valid response with empty trend arrays", async () => {
        const resUser = await pool.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
            ["Empty", "empty@example.com"]
        );
        const emptyId = resUser.rows[0].id;

        const { req, res, getData } = createReqRes(emptyId);
        await getProgress(req, res);
        
        const data = getData();
        assert.strictEqual(data.stats.total_interviews, 0);
        assert.deepStrictEqual(data.pace_trend, []);
        assert.deepStrictEqual(data.filler_trend, []);
        assert.deepStrictEqual(data.star_trend, []);
        assert.deepStrictEqual(data.content_trend, []);
    });

    console.log(`\nTests completed: ${testsPassed} passed, ${testsFailed} failed`);

    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await pool.query("DELETE FROM users WHERE email LIKE 'progress_test_%'");
    
    if (testsFailed > 0) {
        process.exit(1);
    }
}

runTests();
