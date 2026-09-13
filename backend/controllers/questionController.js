const mongoose = require("mongoose");
const Question = require("../models/Question");
const InterviewSession = require("../models/InterviewSession");

// ---------------------------
// INTERNAL ONLY — not wired to any route.
// Called by interviewSessionController (R.1.4, initial question) and
// answerController (R.2.3, adaptive follow-up) after an LLM generates the text.
// Takes plain values, not req/res, and throws on failure so the caller decides
// how to respond to its own client.
// ---------------------------
const createQuestionForSession = async ({ session_id, parent_question_id = null, text, is_followup }) => {
    if (!session_id || !text) {
        throw new Error("session_id and text are required");
    }

    if (parent_question_id) {
        const parentQuestion = await Question.findById(parent_question_id);
        if (!parentQuestion) {
            throw new Error("Referenced parent question does not exist");
        }
        if (String(parentQuestion.session_id) !== String(session_id)) {
            throw new Error("parent_question_id must belong to the same session");
        }
    }

    return Question.create({
        session_id,
        parent_question_id,
        text,
        is_followup: is_followup ?? Boolean(parent_question_id)
    });
};

// Helper — verifies the session belongs to the requesting user.
// Every route below relies on this so one user can never read another's questions.
const findOwnedSession = async (session_id, user_id) => {
    return InterviewSession.findOne({ _id: session_id, user_id });
};

// ---------------------------
// List all questions for a session (own sessions only)
// ---------------------------
const getAllQuestions = async (req, res) => {
    try {
        if (!req.query.session_id || !mongoose.Types.ObjectId.isValid(req.query.session_id)) {
            return res.status(400).json({ message: "A valid session_id filter is required" });
        }

        const session = await findOwnedSession(req.query.session_id, req.user.id);
        if (!session) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const questions = await Question.find({ session_id: req.query.session_id }).sort({ createdAt: 1 });
        res.status(200).json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// Get a single question — only if its session belongs to the user
// ---------------------------
const getQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        const session = await findOwnedSession(question.session_id, req.user.id);
        if (!session) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json(question);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// Follow-ups generated under a given parent question (own sessions only)
// ---------------------------
const getFollowUpsForQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const parentQuestion = await Question.findById(req.params.id);
        if (!parentQuestion) {
            return res.status(404).json({ message: "Question not found" });
        }

        const session = await findOwnedSession(parentQuestion.session_id, req.user.id);
        if (!session) {
            return res.status(404).json({ message: "Question not found" });
        }

        const followUps = await Question.find({ parent_question_id: req.params.id }).sort({ createdAt: 1 });
        res.status(200).json(followUps);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createQuestionForSession, // internal use only — do not add a route for this
    getAllQuestions,
    getQuestion,
    getFollowUpsForQuestion
};