"use strict";

const jobDescriptionRepository = require("../repositories/jobDescriptionRepository");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createJobDescription = async (req, res) => {
    try {
        const { raw_text } = req.body;

        if (typeof raw_text !== "string") {
            return res.status(400).json({ message: "raw_text must be a string" });
        }

        const trimmedText = raw_text.trim();
        if (trimmedText.length < 20) {
            return res.status(400).json({ message: "Job description text seems too short to parse meaningfully" });
        }

        const parsed_keywords = []; // placeholder

        const jobDescription = await jobDescriptionRepository.create(
            req.user.id,
            trimmedText,
            parsed_keywords
        );

        res.status(201).json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: "Failed to create job description" });
    }
};

const getAllJobDescriptions = async (req, res) => {
    try {
        const jobDescriptions = await jobDescriptionRepository.findAllByUserId(req.user.id);
        res.status(200).json(jobDescriptions);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch job descriptions" });
    }
};

const getJobDescription = async (req, res) => {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ message: "Invalid job description id" });
        }

        const jobDescription = await jobDescriptionRepository.findByIdAndUserId(id, req.user.id);
        if (!jobDescription) {
            return res.status(404).json({ message: "Job description not found" });
        }

        res.status(200).json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve job description" });
    }
};

const updateJobDescription = async (req, res) => {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ message: "Invalid job description id" });
        }

        const { raw_text } = req.body;
        if (typeof raw_text !== "string") {
            return res.status(400).json({ message: "raw_text must be a string" });
        }

        const trimmedText = raw_text.trim();
        if (trimmedText.length < 20) {
            return res.status(400).json({ message: "Job description text seems too short to parse meaningfully" });
        }

        const jobDescription = await jobDescriptionRepository.updateByIdAndUserId(
            id,
            req.user.id,
            trimmedText
        );

        if (!jobDescription) {
            return res.status(404).json({ message: "Job description not found" });
        }

        res.status(200).json(jobDescription);
    } catch (error) {
        res.status(500).json({ message: "Failed to update job description" });
    }
};

const deleteJobDescription = async (req, res) => {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({ message: "Invalid job description id" });
        }

        const deleted = await jobDescriptionRepository.deleteByIdAndUserId(id, req.user.id);
        if (!deleted) {
            return res.status(404).json({ message: "Job description not found" });
        }

        res.status(200).json({ message: "Job description deleted" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete job description" });
    }
};

module.exports = {
    createJobDescription,
    getAllJobDescriptions,
    getJobDescription,
    updateJobDescription,
    deleteJobDescription
};