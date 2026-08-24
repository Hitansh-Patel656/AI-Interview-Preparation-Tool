const mongoose = require("mongoose");
const STARAnalysis = require("../models/STARAnalysis");
const Answer = require("../models/Answer");

const createSTARAnalysis = async (req, res) => {
    try {
        const { answer_id, star_compliance_rating, suggestions } = req.body;

        if (!answer_id || star_compliance_rating === undefined || !suggestions) {
            return res.status(400).json({
                message: "answer_id, star_compliance_rating, and suggestions are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(answer_id)) {
            return res.status(400).json({ message: "Invalid answer_id" });
        }

        const answerExists = await Answer.findById(answer_id);
        if (!answerExists) {
            return res.status(404).json({ message: "Referenced answer does not exist" });
        }

        const existing = await STARAnalysis.findOne({ answer_id });
        if (existing) {
            return res.status(409).json({ message: "STAR analysis already exists for this answer" });
        }

        const starAnalysis = await STARAnalysis.create({
            answer_id,
            star_compliance_rating,
            suggestions
        });

        res.status(201).json(starAnalysis);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "STAR analysis already exists for this answer" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getSTARAnalysis = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid STAR analysis id" });
        }

        const starAnalysis = await STARAnalysis.findById(req.params.id);
        if (!starAnalysis) {
            return res.status(404).json({ message: "STAR analysis not found" });
        }

        res.status(200).json(starAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSTARAnalysisByAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.answerId)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        const starAnalysis = await STARAnalysis.findOne({ answer_id: req.params.answerId });
        if (!starAnalysis) {
            return res.status(404).json({ message: "No STAR analysis found for this answer" });
        }

        res.status(200).json(starAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllSTARAnalysis = async (req, res) => {
    try {
        const filter = {};

        if (req.query.answer_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.answer_id)) {
                return res.status(400).json({ message: "Invalid answer_id filter" });
            }
            filter.answer_id = req.query.answer_id;
        }

        const starAnalyses = await STARAnalysis.find(filter);
        res.status(200).json(starAnalyses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSTARAnalysis,
    getAllSTARAnalysis,
    getSTARAnalysis,
    getSTARAnalysisByAnswer
};