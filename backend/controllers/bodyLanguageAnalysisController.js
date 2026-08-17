const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");

const createBodyLanguageAnalysis = async (req, res) => {
    try {
        const bodyLanguageAnalysis = await BodyLanguageAnalysis.create(req.body);
        res.status(201).json(bodyLanguageAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBodyLanguageAnalysis = async (req, res) => {
    try {
        const bodyLanguageAnalysis = await BodyLanguageAnalysis.findById(req.params.id);
        res.status(200).json(bodyLanguageAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }  
};

const getAllBodyLanguageAnalysis = async (req, res) => {
    try {
        const bodyLanguageAnalyses = await BodyLanguageAnalysis.find();
        res.status(200).json(bodyLanguageAnalyses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createBodyLanguageAnalysis,
    getAllBodyLanguageAnalysis,
    getBodyLanguageAnalysis
};
