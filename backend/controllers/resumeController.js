const Resume = require("../models/Resume");

const createResume = async (req, res) => {
    try {
        const resume = await Resume.create(req.body);
        res.status(201).json(resume);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateResume = async (req, res) => {
    try {
        const resume = await Resume.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(resume);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllResume = async (req, res) => {
    try {
        const resumes = await Resume.find();
        res.json(resumes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getResume = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        res.json(resume);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createResume,
    updateResume,
    getAllResume,
    getResume
};
