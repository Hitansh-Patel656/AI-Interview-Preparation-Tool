const STARAnalysis = require("../models/STARAnalysis");

const createSTARAnalysis = async (req, res) => {
    try {
        const starAnalysis = await STARAnalysis.create(req.body);
        res.status(201).json(starAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSTARAnalysis = async (req, res) => {
    try {
        const starAnalysis = await STARAnalysis.findById(req.params.id);
        res.status(200).json(starAnalysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllSTARAnalysis = async (req, res) => {
    try {
        const starAnalyses = await STARAnalysis.find();
        res.status(200).json(starAnalyses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSTARAnalysis,
    getAllSTARAnalysis,
    getSTARAnalysis
};