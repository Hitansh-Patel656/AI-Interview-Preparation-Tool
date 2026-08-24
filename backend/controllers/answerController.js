const mongoose = require("mongoose");
const Answer = require("../models/Answer");
const Question = require("../models/Question");

const createAnswer = async (req, res) => {
    try {
        const { question_id, transcript, audio_url, video_url } = req.body;

        if (!question_id) {
            return res.status(400).json({ message: "question_id is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(question_id)) {
            return res.status(400).json({ message: "Invalid question_id" });
        }

        const questionExists = await Question.findById(question_id);
        if (!questionExists) {
            return res.status(404).json({ message: "Referenced question does not exist" });
        }

        const existingAnswer = await Answer.findOne({ question_id });
        if (existingAnswer) {
            return res.status(409).json({ message: "An answer already exists for this question" });
        }

        const answer = await Answer.create({ question_id, transcript, audio_url, video_url });
        res.status(201).json(answer);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An answer already exists for this question" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        const answer = await Answer.findById(req.params.id);
        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }

        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Direct lookup by question — this is how R.2.2/R.3.x flows will actually fetch it
const getAnswerByQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.questionId)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const answer = await Answer.findOne({ question_id: req.params.questionId });
        if (!answer) {
            return res.status(404).json({ message: "No answer found for this question" });
        }

        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllAnswers = async (req, res) => {
    try {
        const filter = {};

        if (req.query.question_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.question_id)) {
                return res.status(400).json({ message: "Invalid question_id filter" });
            }
            filter.question_id = req.query.question_id;
        }

        const answers = await Answer.find(filter).sort({ createdAt: 1 });
        res.status(200).json(answers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Needed because the flow is: create Answer with audio_url first (R.2.1),
// then fill in transcript once STT finishes (R.2.2) — this is not a
// free-form edit, just the completion of the same recording step
const updateAnswerTranscript = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        if (req.body.transcript === undefined) {
            return res.status(400).json({ message: "transcript is required to update" });
        }

        const answer = await Answer.findByIdAndUpdate(
            req.params.id,
            { transcript: req.body.transcript },
            { new: true, runValidators: true }
        );

        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }

        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAnswer,
    getAnswer,
    getAnswerByQuestion,
    getAllAnswers,
    updateAnswerTranscript
};