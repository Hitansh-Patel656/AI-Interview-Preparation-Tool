const mongoose = require("mongoose");
const PostInterviewOutcome = require("../models/PostInterviewOutcome");
const User = require("../models/User");

const createPostInterviewOutcome = async (req, res) => {
    try {
        const { user_id, company_name, role, round, outcome, difficulty } = req.body;

        if (!user_id || !company_name || !role || !round || !outcome || !difficulty) {
            return res.status(400).json({
                message: "user_id, company_name, role, round, outcome, and difficulty are all required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: "Invalid user_id" });
        }

        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "Referenced user does not exist" });
        }

        const postInterviewOutcome = await PostInterviewOutcome.create({
            user_id,
            company_name,
            role,
            round,
            outcome,
            difficulty
        });

        res.status(201).json(postInterviewOutcome);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getAllPostInterviewOutcomes = async (req, res) => {
    try {
        const filter = {};

        if (req.query.user_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.user_id)) {
                return res.status(400).json({ message: "Invalid user_id filter" });
            }
            filter.user_id = req.query.user_id;
        }

        const postInterviewOutcomes = await PostInterviewOutcome.find(filter).sort({ createdAt: -1 });
        res.status(200).json(postInterviewOutcomes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPostInterviewOutcome = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid post-interview outcome id" });
        }

        const postInterviewOutcome = await PostInterviewOutcome.findById(req.params.id);
        if (!postInterviewOutcome) {
            return res.status(404).json({ message: "Post-interview outcome not found" });
        }

        res.status(200).json(postInterviewOutcome);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatePostInterviewOutcome = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid post-interview outcome id" });
        }

        // user_id shouldn't be reassignable after the fact — only the
        // submitted form fields themselves are correctable
        const allowedUpdates = ["company_name", "role", "round", "outcome", "difficulty"];
        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const postInterviewOutcome = await PostInterviewOutcome.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!postInterviewOutcome) {
            return res.status(404).json({ message: "Post-interview outcome not found" });
        }

        res.status(200).json(postInterviewOutcome);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const deletePostInterviewOutcome = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid post-interview outcome id" });
        }

        const postInterviewOutcome = await PostInterviewOutcome.findByIdAndDelete(req.params.id);
        if (!postInterviewOutcome) {
            return res.status(404).json({ message: "Post-interview outcome not found" });
        }

        res.status(200).json({ message: "Post-interview outcome deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPostInterviewOutcome,
    getAllPostInterviewOutcomes,
    getPostInterviewOutcome,
    updatePostInterviewOutcome,
    deletePostInterviewOutcome
};