const mongoose = require("mongoose");
const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");
const Answer = require("../models/Answer");

const createBodyLanguageAnalysis = async (req, res) => {
    try {
        const { answer_id, eye_contact_score, posture_score, nervous_habits } = req.body;

        if (!answer_id || eye_contact_score === undefined || posture_score === undefined || !nervous_habits) {
            return res.status(400).json({
                message: "answer_id, eye_contact_score, posture_score, and nervous_habits are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(answer_id)) {
            return res.status(400).json({ message: "Invalid answer_id" });
        }

        const answer = await Answer.findById(answer_id);
        if (!answer) {
            return res.status(404).json({ message: "Referenced answer does not exist" });
        }

        // R.3.5: only applicable if video capture (R.2.4) actually happened for this answer
        if (!answer.video_url) {
            return res.status(400).json({
                message: "This answer has no recorded video; body-language analysis is not applicable"
            });
        }

        const existing = await BodyLanguageAnalysis.findOne({ answer_id });
        if (existing) {
            return res.status(409).json({ message: "Body-language analysis already exists for this answer" });
        }

        const bodyLanguageAnalysis = await BodyLanguageAnalysis.create({
            answer_id,
            eye_contact_score,
            posture_score,
            nervous_habits
        });

        res.status(201).json(bodyLanguageAnalysis);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Body-language analysis already exists for this answer" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getBodyLanguageAnalysis = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid body-language analysis id" });
        }

        const bodyLanguageAnalysis = await BodyLanguageAnalysis.findById(req.params.id);
        if (!bodyLanguageAnalysis) {
            return res.status(404).json({ message: "Body-language analysis not found" });
        }

        res.status(200).json(bodyLanguageAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBodyLanguageAnalysisByAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.answerId)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        const bodyLanguageAnalysis = await BodyLanguageAnalysis.findOne({ answer_id: req.params.answerId });
        if (!bodyLanguageAnalysis) {
            return res.status(404).json({ message: "No body-language analysis found for this answer" });
        }

        res.status(200).json(bodyLanguageAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllBodyLanguageAnalysis = async (req, res) => {
    try {
        const filter = {};

        if (req.query.answer_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.answer_id)) {
                return res.status(400).json({ message: "Invalid answer_id filter" });
            }
            filter.answer_id = req.query.answer_id;
        }

        const bodyLanguageAnalyses = await BodyLanguageAnalysis.find(filter);
        res.status(200).json(bodyLanguageAnalyses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createBodyLanguageAnalysis,
    getAllBodyLanguageAnalysis,
    getBodyLanguageAnalysis,
    getBodyLanguageAnalysisByAnswer
};