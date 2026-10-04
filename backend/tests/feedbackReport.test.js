const assert = require("assert");
const mongoose = require("mongoose");
const { getFeedbackReportBySession } = require("../controllers/feedbackReportController");

// Mocks
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const STARAnalysis = require("../models/STARAnalysis");
const ModelAnswer = require("../models/ModelAnswer");
const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");
const authUtils = require("../utils/authUtils");

// Store original methods to restore later
const originals = {
    sessionFindById: InterviewSession.findById,
    sessionFindOne: InterviewSession.findOne,
    questionFind: Question.find,
    answerFind: Answer.find,
    crFind: ContentRelevanceScore.find,
    starFind: STARAnalysis.find,
    modelFind: ModelAnswer.find,
    blFind: BodyLanguageAnalysis.find,
    verifySessionOwner: authUtils.verifySessionOwner
};

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

const runTests = async () => {
    let passed = 0;
    let failed = 0;

    const mockId = (id) => new mongoose.Types.ObjectId(Buffer.from(id.padStart(12, '0')).toString('hex'));

    const testCases = [
        {
            name: "Complete feedback report (all analyses present)",
            setup: () => {
                const sId = mockId("1");
                const uId = mockId("u1");
                const qId = mockId("2");
                const aId = mockId("3");

                InterviewSession.findById = () => ({ lean: () => ({ _id: sId, role: "SWE", status: "completed" }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                Question.find = () => ({ sort: () => ({ lean: () => [{ _id: qId, session_id: sId, text: "Q1", createdAt: 1 }] }) });
                Answer.find = () => ({ lean: () => [{ _id: aId, question_id: qId, transcript: "answer 1", video_url: "/uploads/videos/v1.mp4" }] });
                ContentRelevanceScore.find = () => ({ lean: () => [{ answer_id: aId, score: 90, notes: "good" }] });
                STARAnalysis.find = () => ({ lean: () => [{ answer_id: aId, star_compliance_rating: 80, suggestions: "ok" }] });
                ModelAnswer.find = () => ({ lean: () => [{ question_id: qId, generated_text: "model 1" }] });
                BodyLanguageAnalysis.find = () => ({ lean: () => [{ answer_id: aId, overall_body_language_score: 85 }] });

                return {
                    req: { params: { sessionId: sId }, user: { id: uId } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(res.data.questions.length, 1);
                        assert.strictEqual(res.data.questions[0].evaluation.content_relevance.score, 90);
                        assert.strictEqual(res.data.questions[0].evaluation.star_analysis.star_compliance_rating, 80);
                        assert.strictEqual(res.data.questions[0].evaluation.model_answer.generated_text, "model 1");
                        assert.strictEqual(res.data.questions[0].body_language.overall_body_language_score, 85);
                        assert.strictEqual(res.data.questions[0].answer.video_url, `/api/sessions/${sId}/questions/${qId}/video`);
                        assert.strictEqual(res.data.summary.overall_score, 85); // (90+80+85)/3 = 85
                    }
                };
            }
        },
        {
            name: "Missing body-language analysis",
            setup: () => {
                const sId = mockId("1");
                const qId = mockId("2");
                const aId = mockId("3");

                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                Question.find = () => ({ sort: () => ({ lean: () => [{ _id: qId, session_id: sId }] }) });
                Answer.find = () => ({ lean: () => [{ _id: aId, question_id: qId }] });
                ContentRelevanceScore.find = () => ({ lean: () => [{ answer_id: aId, score: 90 }] });
                STARAnalysis.find = () => ({ lean: () => [{ answer_id: aId, star_compliance_rating: 80 }] });
                ModelAnswer.find = () => ({ lean: () => [{ question_id: qId }] });
                BodyLanguageAnalysis.find = () => ({ lean: () => [] }); // Missing

                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(res.data.questions[0].body_language, null);
                        assert.strictEqual(res.data.summary.body_language_score, null);
                        assert.strictEqual(res.data.summary.overall_score, 85); // (90+80)/2 = 85
                    }
                };
            }
        },
        {
            name: "Missing STAR analysis",
            setup: () => {
                const sId = mockId("1");
                const qId = mockId("2");
                const aId = mockId("3");

                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                Question.find = () => ({ sort: () => ({ lean: () => [{ _id: qId, session_id: sId }] }) });
                Answer.find = () => ({ lean: () => [{ _id: aId, question_id: qId }] });
                ContentRelevanceScore.find = () => ({ lean: () => [{ answer_id: aId, score: 90 }] });
                STARAnalysis.find = () => ({ lean: () => [] }); // Missing
                ModelAnswer.find = () => ({ lean: () => [{ question_id: qId }] });
                BodyLanguageAnalysis.find = () => ({ lean: () => [{ answer_id: aId, overall_body_language_score: 80 }] });

                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(res.data.questions[0].evaluation.star_analysis, null);
                        assert.strictEqual(res.data.summary.star_compliance_score, null);
                        assert.strictEqual(res.data.summary.overall_score, 85); // (90+80)/2 = 85
                    }
                };
            }
        },
        {
            name: "Missing model answer",
            setup: () => {
                const sId = mockId("1");
                const qId = mockId("2");
                const aId = mockId("3");

                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                Question.find = () => ({ sort: () => ({ lean: () => [{ _id: qId, session_id: sId }] }) });
                Answer.find = () => ({ lean: () => [{ _id: aId, question_id: qId }] });
                ContentRelevanceScore.find = () => ({ lean: () => [{ answer_id: aId, score: 90 }] });
                STARAnalysis.find = () => ({ lean: () => [{ answer_id: aId, star_compliance_rating: 80 }] });
                ModelAnswer.find = () => ({ lean: () => [] }); // Missing
                BodyLanguageAnalysis.find = () => ({ lean: () => [{ answer_id: aId, overall_body_language_score: 80 }] });

                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(res.data.questions[0].evaluation.model_answer, null);
                    }
                };
            }
        },
        {
            name: "Follow-up question relationship",
            setup: () => {
                const sId = mockId("1");
                const q1Id = mockId("q1");
                const q2Id = mockId("q2");

                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                Question.find = () => ({ sort: () => ({ lean: () => [
                    { _id: q1Id, session_id: sId, is_followup: false, parent_question_id: null },
                    { _id: q2Id, session_id: sId, is_followup: true, parent_question_id: q1Id }
                ] }) });
                Answer.find = () => ({ lean: () => [] });
                ContentRelevanceScore.find = () => ({ lean: () => [] });
                STARAnalysis.find = () => ({ lean: () => [] });
                ModelAnswer.find = () => ({ lean: () => [] });
                BodyLanguageAnalysis.find = () => ({ lean: () => [] });

                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(res.data.questions.length, 2);
                        assert.strictEqual(res.data.questions[0].is_followup, false);
                        assert.strictEqual(res.data.questions[1].is_followup, true);
                        assert.strictEqual(res.data.questions[1].parent_question_id.toString(), q1Id.toString());
                    }
                };
            }
        },
        {
            name: "Deterministic question ordering",
            setup: () => {
                const sId = mockId("1");
                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                let sortCalled = false;
                Question.find = () => ({ 
                    sort: (param) => {
                        if (param.createdAt === 1) sortCalled = true;
                        return { lean: () => [] };
                    } 
                });
                Answer.find = () => ({ lean: () => [] });
                ContentRelevanceScore.find = () => ({ lean: () => [] });
                STARAnalysis.find = () => ({ lean: () => [] });
                ModelAnswer.find = () => ({ lean: () => [] });
                BodyLanguageAnalysis.find = () => ({ lean: () => [] });

                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(sortCalled, true, "sort({ createdAt: 1 }) was not called");
                    }
                };
            }
        },
        {
            name: "Unauthorized session",
            setup: () => {
                const sId = mockId("1");
                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => null }) }); // UNAUTHORIZED
                
                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 404);
                    }
                };
            }
        },
        {
            name: "Correct summary calculation with missing categories",
            setup: () => {
                const sId = mockId("1");
                const q1Id = mockId("q1"); const a1Id = mockId("a1");
                const q2Id = mockId("q2"); const a2Id = mockId("a2");

                InterviewSession.findById = () => ({ lean: () => ({ _id: sId }) });
                InterviewSession.findOne = () => ({ select: () => ({ lean: () => ({ _id: sId }) }) });
                
                Question.find = () => ({ sort: () => ({ lean: () => [{ _id: q1Id }, { _id: q2Id }] }) });
                Answer.find = () => ({ lean: () => [{ _id: a1Id, question_id: q1Id }, { _id: a2Id, question_id: q2Id }] });
                
                // Q1 has CR (100) and STAR (80)
                // Q2 has CR (90) and BL (90)
                ContentRelevanceScore.find = () => ({ lean: () => [{ answer_id: a1Id, score: 100 }, { answer_id: a2Id, score: 90 }] });
                STARAnalysis.find = () => ({ lean: () => [{ answer_id: a1Id, star_compliance_rating: 80 }] });
                BodyLanguageAnalysis.find = () => ({ lean: () => [{ answer_id: a2Id, overall_body_language_score: 90 }] });
                ModelAnswer.find = () => ({ lean: () => [] });

                return {
                    req: { params: { sessionId: sId }, user: { id: "u1" } },
                    verify: (res) => {
                        assert.strictEqual(res.statusCode, 200);
                        assert.strictEqual(res.data.summary.content_relevance_score, 95); // (100+90)/2
                        assert.strictEqual(res.data.summary.star_compliance_score, 80); // (80)/1
                        assert.strictEqual(res.data.summary.body_language_score, 90); // (90)/1
                        assert.strictEqual(res.data.summary.overall_score, 88); // Math.round((95+80+90)/3) = 88
                    }
                };
            }
        }
    ];

    for (const test of testCases) {
        try {
            const { req, verify } = test.setup();
            const res = mockRes();
            await getFeedbackReportBySession(req, res);
            verify(res);
            console.log(`✅ ${test.name}`);
            passed++;
        } catch (err) {
            console.error(`❌ ${test.name}`);
            console.error(err);
            failed++;
        } finally {
            // Restore mocks
            InterviewSession.findById = originals.sessionFindById;
            InterviewSession.findOne = originals.sessionFindOne;
            Question.find = originals.questionFind;
            Answer.find = originals.answerFind;
            ContentRelevanceScore.find = originals.crFind;
            STARAnalysis.find = originals.starFind;
            ModelAnswer.find = originals.modelFind;
            BodyLanguageAnalysis.find = originals.blFind;
            authUtils.verifySessionOwner = originals.verifySessionOwner;
        }
    }

    console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
};

runTests();
