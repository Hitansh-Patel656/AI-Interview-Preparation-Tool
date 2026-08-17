const Answer = require("../models/Answer");

const createAnswer = async (req, res) => {
    try {
        const answer = await Answer.create(req.body);
        res.status(201).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAnswer = async (req, res) => {
    try {
        const answer = await Answer.findById(req.params.id);
        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllAnswers = async (req, res) => {
    try {
        const answers = await Answer.find();
        res.status(200).json(answers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAnswer,
    getAnswer,
    getAllAnswers
};