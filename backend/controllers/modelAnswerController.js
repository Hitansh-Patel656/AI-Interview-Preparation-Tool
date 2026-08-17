const ModelAnswer = require("../models/ModelAnswer");

const createModelAnswer = async (req, res) => {
    try {
        const modelAnswer = await ModelAnswer.create(req.body);
        res.status(201).json(modelAnswer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getModelAnswer = async (req, res) => {
    try {
        const modelAnswer = await ModelAnswer.findById(req.params.id);
        res.status(200).json(modelAnswer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllModelAnswers = async (req, res) => {
    try {
        const modelAnswers = await ModelAnswer.find();
        res.status(200).json(modelAnswers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createModelAnswer,
    getModelAnswer,
    getAllModelAnswers
};
