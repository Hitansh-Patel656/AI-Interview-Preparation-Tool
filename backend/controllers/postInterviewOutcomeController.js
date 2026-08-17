const PostInterviewOutcome = require("../models/PostInterviewOutcome");

const createPostInterviewOutcome = async (req, res) => {
    try {
        const postInterviewOutcome = await PostInterviewOutcome.create(req.body);
        res.status(201).json(postInterviewOutcome);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllPostInterviewOutcome = async (req, res) => {
    try {
        const postInterviewOutcomes = await PostInterviewOutcome.find();
        res.status(200).json(postInterviewOutcomes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPostInterviewOutcome = async (req, res) => {
    try {
        const postInterviewOutcome = await PostInterviewOutcome.findById(req.params.id);
        res.status(200).json(postInterviewOutcome);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatePostInterviewOutcome = async (req, res) => {
    try {
        const postInterviewOutcome = await PostInterviewOutcome.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(postInterviewOutcome);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPostInterviewOutcome,
    getAllPostInterviewOutcome,
    updatePostInterviewOutcome,
    getPostInterviewOutcome
};