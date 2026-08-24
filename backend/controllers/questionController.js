const mongoose = require("mongoose");
const Question = require("../models/Question");
const InterviewSession = require("../models/InterviewSession");

const createQuestion = async (req, res) => {
    try {
        const { session_id, parent_question_id, text, is_followup } = req.body;

        if (!session_id || !text) {
            return res.status(400).json({ message: "session_id and text are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(session_id)) {
            return res.status(400).json({ message: "Invalid session_id" });
        }

        const sessionExists = await InterviewSession.findById(session_id);
        if (!sessionExists) {
            return res.status(404).json({ message: "Referenced interview session does not exist" });
        }

        // A follow-up must actually point to a real parent question in the same session
        if (parent_question_id !== undefined && parent_question_id !== null) {
            if (!mongoose.Types.ObjectId.isValid(parent_question_id)) {
                return res.status(400).json({ message: "Invalid parent_question_id" });
            }

            const parentQuestion = await Question.findById(parent_question_id);
            if (!parentQuestion) {
                return res.status(404).json({ message: "Referenced parent question does not exist" });
            }

            if (String(parentQuestion.session_id) !== String(session_id)) {
                return res.status(400).json({
                    message: "parent_question_id must belong to the same session"
                });
            }
        }

        const question = await Question.create({
            session_id,
            parent_question_id: parent_question_id || null,
            text,
            is_followup: is_followup ?? Boolean(parent_question_id)
        });

        res.status(201).json(question);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getAllQuestions = async (req, res) => {
    try {
        const filter = {};

        // Without this, one request pulls every question for every session ever run
        if (req.query.session_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.session_id)) {
                return res.status(400).json({ message: "Invalid session_id filter" });
            }
            filter.session_id = req.query.session_id;
        }

        const questions = await Question.find(filter).sort({ createdAt: 1 });
        res.status(200).json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json(question);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetches follow-up questions generated under a given parent question,
// directly modeling the "generates follow up" self-reference from the ER diagram
const getFollowUpsForQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const followUps = await Question.find({ parent_question_id: req.params.id }).sort({ createdAt: 1 });
        res.status(200).json(followUps);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createQuestion,
    getAllQuestions,
    getQuestion,
    getFollowUpsForQuestion
};