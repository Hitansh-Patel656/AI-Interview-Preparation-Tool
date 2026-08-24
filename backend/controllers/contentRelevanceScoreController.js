const mongoose = require("mongoose");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const Answer = require("../models/Answer");

const createContentRelevanceScore = async (req, res) => {
    try {
        const { answer_id, score, notes } = req.body;

        if (!answer_id || score === undefined || !notes) {
            return res.status(400).json({ message: "answer_id, score, and notes are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(answer_id)) {
            return res.status(400).json({ message: "Invalid answer_id" });
        }

        const answerExists = await Answer.findById(answer_id);
        if (!answerExists) {
            return res.status(404).json({ message: "Referenced answer does not exist" });
        }

        const existing = await ContentRelevanceScore.findOne({ answer_id });
        if (existing) {
            return res.status(409).json({ message: "Content relevance score already exists for this answer" });
        }

        const contentRelevanceScore = await ContentRelevanceScore.create({ answer_id, score, notes });
        res.status(201).json(contentRelevanceScore);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Content relevance score already exists for this answer" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getContentRelevanceScore = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid content relevance score id" });
        }

        const contentRelevanceScore = await ContentRelevanceScore.findById(req.params.id);
        if (!contentRelevanceScore) {
            return res.status(404).json({ message: "Content relevance score not found" });
        }

        res.status(200).json(contentRelevanceScore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getContentRelevanceScoreByAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.answerId)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        const contentRelevanceScore = await ContentRelevanceScore.findOne({ answer_id: req.params.answerId });
        if (!contentRelevanceScore) {
            return res.status(404).json({ message: "No content relevance score found for this answer" });
        }

        res.status(200).json(contentRelevanceScore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllContentRelevanceScores = async (req, res) => {
    try {
        const filter = {};

        if (req.query.answer_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.answer_id)) {
                return res.status(400).json({ message: "Invalid answer_id filter" });
            }
            filter.answer_id = req.query.answer_id;
        }

        const contentRelevanceScores = await ContentRelevanceScore.find(filter);
        res.status(200).json(contentRelevanceScores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createContentRelevanceScore,
    getAllContentRelevanceScores,
    getContentRelevanceScore,
    getContentRelevanceScoreByAnswer
};