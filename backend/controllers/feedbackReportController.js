const mongoose = require("mongoose");
const FeedbackReport = require("../models/FeedbackReport");
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const STARAnalysis = require("../models/STARAnalysis");
const ModelAnswer = require("../models/ModelAnswer");
const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");
const { verifySessionOwner } = require("../utils/authUtils");

const createFeedbackReport = async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ message: "session_id is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(session_id)) {
            return res.status(400).json({ message: "Invalid session_id" });
        }

        const sessionExists = await InterviewSession.findById(session_id);
        if (!sessionExists) {
            return res.status(404).json({ message: "Referenced interview session does not exist" });
        }

        const isOwner = await verifySessionOwner(session_id, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "Referenced interview session does not exist" });
        }

        const existingReport = await FeedbackReport.findOne({ session_id });
        if (existingReport) {
            return res.status(409).json({ message: "A feedback report already exists for this session" });
        }

        const feedbackReport = await FeedbackReport.create({ session_id });
        res.status(201).json(feedbackReport);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "A feedback report already exists for this session" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getFeedbackReport = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid feedback report id" });
        }

        const feedbackReport = await FeedbackReport.findById(req.params.id);

        if (!feedbackReport) {
            return res.status(404).json({ message: "Feedback report not found" });
        }

        const isOwner = await verifySessionOwner(feedbackReport.session_id, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "Feedback report not found" });
        }

        res.status(200).json(feedbackReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lets the frontend fetch the report directly by session, which is
// how R.3.6's "view report after session ends" flow will actually be used
const getFeedbackReportBySession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.sessionId)) {
            return res.status(400).json({ message: "Invalid session id" });
        }

        const session = await InterviewSession.findById(req.params.sessionId).lean();
        if (!session) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const isOwner = await verifySessionOwner(req.params.sessionId, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        // Fetch questions, sort by creation date to preserve natural interview order
        const questions = await Question.find({ session_id: req.params.sessionId }).sort({ createdAt: 1 }).lean();
        const questionIds = questions.map(q => q._id);

        // Fetch answers for these questions
        const answers = await Answer.find({ question_id: { $in: questionIds } }).lean();
        const answerIds = answers.map(a => a._id);

        // Batch fetch analyses to avoid N+1
        const [crScores, starScores, modelAnswers, bodyLanguageScores] = await Promise.all([
            ContentRelevanceScore.find({ answer_id: { $in: answerIds } }).lean(),
            STARAnalysis.find({ answer_id: { $in: answerIds } }).lean(),
            ModelAnswer.find({ question_id: { $in: questionIds } }).lean(),
            BodyLanguageAnalysis.find({ answer_id: { $in: answerIds } }).lean()
        ]);

        // Build memory lookup maps
        const answerMap = new Map(answers.map(a => [a.question_id.toString(), a]));
        const crMap = new Map(crScores.map(c => [c.answer_id.toString(), c]));
        const starMap = new Map(starScores.map(s => [s.answer_id.toString(), s]));
        const modelMap = new Map(modelAnswers.map(m => [m.question_id.toString(), m]));
        const blMap = new Map(bodyLanguageScores.map(b => [b.answer_id.toString(), b]));

        // Construct final questions array
        const aggregatedQuestions = questions.map(q => {
            const answer = answerMap.get(q._id.toString());
            let evaluation = null;
            let bodyLanguage = null;

            const model = modelMap.get(q._id.toString());

            if (answer) {
                const cr = crMap.get(answer._id.toString());
                const star = starMap.get(answer._id.toString());
                const bl = blMap.get(answer._id.toString());

                if (cr || star || model) {
                    evaluation = {
                        content_relevance: cr ? { score: cr.score, notes: cr.notes } : null,
                        star_analysis: star ? { star_compliance_rating: star.star_compliance_rating, suggestions: star.suggestions } : null,
                        model_answer: model ? { generated_text: model.generated_text } : null
                    };
                }

                if (bl) {
                    bodyLanguage = {
                        overall_body_language_score: bl.overall_body_language_score,
                        eye_contact_score: bl.eye_contact_score,
                        posture_score: bl.posture_score,
                        facial_expression_score: bl.facial_expression_score,
                        confidence_score: bl.confidence_score,
                        nervous_habits_score: bl.nervous_habits_score,
                        nervous_habits: bl.nervous_habits,
                        strengths: bl.strengths,
                        improvement_suggestions: bl.improvement_suggestions,
                        notable_moments: bl.notable_moments
                    };
                }
            } else if (model) {
                // If there's no answer but a model answer exists (edge case)
                evaluation = {
                    content_relevance: null,
                    star_analysis: null,
                    model_answer: { generated_text: model.generated_text }
                };
            }

            return {
                id: q._id,
                text: q.text,
                is_followup: q.is_followup,
                parent_question_id: q.parent_question_id,
                answer: answer ? {
                    id: answer._id,
                    transcript: answer.transcript,
                    video_url: answer.video_url ? `/api/sessions/${session._id}/questions/${q._id}/video` : null
                } : null,
                evaluation: evaluation,
                body_language: bodyLanguage
            };
        });

        // Compute session-level averages for convenience based on existing components
        let totalCr = 0, countCr = 0;
        let totalStar = 0, countStar = 0;
        let totalBl = 0, countBl = 0;

        for (const aq of aggregatedQuestions) {
            if (aq.evaluation?.content_relevance?.score != null) {
                totalCr += aq.evaluation.content_relevance.score;
                countCr++;
            }
            if (aq.evaluation?.star_analysis?.star_compliance_rating != null) {
                totalStar += aq.evaluation.star_analysis.star_compliance_rating;
                countStar++;
            }
            if (aq.body_language?.overall_body_language_score != null) {
                totalBl += aq.body_language.overall_body_language_score;
                countBl++;
            }
        }

        const crAvg = countCr > 0 ? Math.round(totalCr / countCr) : null;
        const starAvg = countStar > 0 ? Math.round(totalStar / countStar) : null;
        const blAvg = countBl > 0 ? Math.round(totalBl / countBl) : null;

        let overallTotal = 0, overallCount = 0;
        if (crAvg !== null) { overallTotal += crAvg; overallCount++; }
        if (starAvg !== null) { overallTotal += starAvg; overallCount++; }
        if (blAvg !== null) { overallTotal += blAvg; overallCount++; }

        const overall_score = overallCount > 0 ? Math.round(overallTotal / overallCount) : 0;

        const report = {
            session: {
                id: session._id,
                role: session.role,
                interview_type: session.interview_type,
                job_description_id: session.job_description_id,
                status: session.status,
                started_at: session.createdAt,
                ended_at: session.ended_at
            },
            summary: {
                overall_score,
                content_relevance_score: crAvg,
                star_compliance_score: starAvg,
                body_language_score: blAvg
            },
            questions: aggregatedQuestions
        };

        res.status(200).json(report);
    } catch (error) {
        console.error("[Feedback Report] Failed to generate aggregated report:", error.message);
        res.status(500).json({ message: "Unexpected error generating feedback report" });
    }
};

const getAllFeedbackReports = async (req, res) => {
    try {
        // Find all sessions owned by this user
        const userSessions = await InterviewSession.find({ user_id: req.user.id }).select("_id").lean();
        const sessionIds = userSessions.map(s => s._id);

        const feedbackReports = await FeedbackReport.find({ session_id: { $in: sessionIds } }).sort({ generated_at: -1 });
        res.status(200).json(feedbackReports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createFeedbackReport,
    getFeedbackReport,
    getFeedbackReportBySession,
    getAllFeedbackReports
};