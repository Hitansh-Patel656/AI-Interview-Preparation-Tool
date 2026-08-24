const mongoose = require("mongoose");
const ModelAnswer = require("../models/ModelAnswer");
const Question = require("../models/Question");

const createModelAnswer = async (req, res) => {
    try {
        const { question_id, generated_text } = req.body;

        if (!question_id || !generated_text) {
            return res.status(400).json({ message: "question_id and generated_text are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(question_id)) {
            return res.status(400).json({ message: "Invalid question_id" });
        }

        const questionExists = await Question.findById(question_id);
        if (!questionExists) {
            return res.status(404).json({ message: "Referenced question does not exist" });
        }

        const existingModelAnswer = await ModelAnswer.findOne({ question_id });
        if (existingModelAnswer) {
            return res.status(409).json({ message: "A model answer already exists for this question" });
        }

        const modelAnswer = await ModelAnswer.create({ question_id, generated_text });
        res.status(201).json(modelAnswer);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "A model answer already exists for this question" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getModelAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid model answer id" });
        }

        const modelAnswer = await ModelAnswer.findById(req.params.id);
        if (!modelAnswer) {
            return res.status(404).json({ message: "Model answer not found" });
        }

        res.status(200).json(modelAnswer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Direct lookup by question — this is how the Feedback Report Screen (R.3.6)
// will actually fetch it when assembling a per-question scorecard
const getModelAnswerByQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.questionId)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const modelAnswer = await ModelAnswer.findOne({ question_id: req.params.questionId });
        if (!modelAnswer) {
            return res.status(404).json({ message: "No model answer found for this question" });
        }

        res.status(200).json(modelAnswer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllModelAnswers = async (req, res) => {
    try {
        const filter = {};

        if (req.query.question_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.question_id)) {
                return res.status(400).json({ message: "Invalid question_id filter" });
            }
            filter.question_id = req.query.question_id;
        }

        const modelAnswers = await ModelAnswer.find(filter);
        res.status(200).json(modelAnswers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createModelAnswer,
    getModelAnswer,
    getModelAnswerByQuestion,
    getAllModelAnswers
};