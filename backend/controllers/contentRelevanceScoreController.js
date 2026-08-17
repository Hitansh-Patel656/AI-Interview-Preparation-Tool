const ContentRelevanceScore = require("../models/ContentRelevanceScore");

const createContentRelevanceScore = async (req, res) => {
    try {
        const contentRelevanceScore = await ContentRelevanceScore.create(req.body);
        res.status(201).json(contentRelevanceScore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getContentRelevanceScore = async (req, res) => {
    try {
        const contentRelevanceScore = await ContentRelevanceScore.findById(req.params.id);
        res.status(200).json(contentRelevanceScore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllContentRelevanceScores = async (req, res) => {
    try {
        const contentRelevanceScores = await ContentRelevanceScore.find();
        res.status(200).json(contentRelevanceScores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
};

module.exports = {
    createContentRelevanceScore,
    getAllContentRelevanceScores,
    getContentRelevanceScore
};
