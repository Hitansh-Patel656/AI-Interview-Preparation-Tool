const mongoose = require("mongoose");
const JobDescription = require("../models/JobDescription");
const User = require("../models/User");

const createJobDescription = async (req, res) => {
    try {
        const { user_id, raw_text } = req.body;

        if (!user_id || !raw_text) {
            return res.status(400).json({ message: "user_id and raw_text are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: "Invalid user_id" });
        }

        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "Referenced user does not exist" });
        }

        const jobDescription = await JobDescription.create({ user_id, raw_text });
        res.status(201).json(jobDescription);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getAllJobDescriptions = async (req, res) => {
    try {
        const filter = {};

        // Without this, one user could pull every other user's job descriptions
        if (req.query.user_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.user_id)) {
                return res.status(400).json({ message: "Invalid user_id filter" });
            }
            filter.user_id = req.query.user_id;
        }

        const jobDescriptions = await JobDescription.find(filter).sort({ createdAt: -1 });
        res.status(200).json(jobDescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getJobDescription = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid job description id" });
        }

        const jobDescription = await JobDescription.findById(req.params.id);
        if (!jobDescription) {
            return res.status(404).json({ message: "Job description not found" });
        }

        res.status(200).json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateJobDescription = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid job description id" });
        }

        // raw_text is the only thing a user would realistically edit —
        // user_id and parsed_keywords shouldn't be hand-edited via this endpoint
        if (req.body.raw_text === undefined) {
            return res.status(400).json({ message: "raw_text is required to update" });
        }

        const jobDescription = await JobDescription.findByIdAndUpdate(
            req.params.id,
            { raw_text: req.body.raw_text },
            { new: true, runValidators: true }
        );

        if (!jobDescription) {
            return res.status(404).json({ message: "Job description not found" });
        }

        res.status(200).json(jobDescription);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const deleteJobDescription = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid job description id" });
        }

        const jobDescription = await JobDescription.findByIdAndDelete(req.params.id);
        if (!jobDescription) {
            return res.status(404).json({ message: "Job description not found" });
        }

        res.status(200).json({ message: "Job description deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createJobDescription,
    getAllJobDescriptions,
    getJobDescription,
    updateJobDescription,
    deleteJobDescription
};