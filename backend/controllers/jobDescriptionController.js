const JobDescription = require("../models/JobDescription");

const createJobDescription = async (req, res) => {
    try {
        const jobDescription = await JobDescription.create(req.body);
        res.status(201).json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllJobDescription = async (req, res) => {
    try {
        const jobDescriptions = await JobDescription.find();
        res.status(200).json(jobDescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getJobDescription = async (req, res) => {
    try {
        const jobDescription = await JobDescription.findById(req.params.id);
        res.status(200).json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateJobDescription = async (req, res) => {
    try {
        const jobDescription = await JobDescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createJobDescription,
    getAllJobDescription,
    updateJobDescription,
    getJobDescription
};