const mongoose = require("mongoose");
const JobDescription = require("../models/JobDescription");

const createJobDescription = async (req, res) => {
    try {
        const { raw_text } = req.body;

        if (!raw_text) {
            return res.status(400).json({ message: "raw_text is required" });
        }

        // Delegate keyword/requirement extraction to a parsing service.
        // const parsed_keywords = await jdParserService.parse(raw_text);
        const parsed_keywords = []; // placeholder

        const jobDescription = await JobDescription.create({
            user_id: req.user.id, // taken from the authenticated user, never the request body
            raw_text,
            parsed_keywords
        });

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
        const jobDescriptions = await JobDescription.find({ user_id: req.user.id })
            .sort({ createdAt: -1 });

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

        const jobDescription = await JobDescription.findOne({
            _id: req.params.id,
            user_id: req.user.id
        });

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

        const jobDescription = await JobDescription.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
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

        const jobDescription = await JobDescription.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user.id
        });

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