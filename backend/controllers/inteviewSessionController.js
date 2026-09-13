const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSession");
const JobDescription = require("../models/JobDescription");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ---------------------------
// R.1.4 - Create a new interview session for the logged-in user
// ---------------------------
const createInterviewSession = async (req, res) => {
    try {
        const { role, interview_type, job_description_id } = req.body;

        if (!role || !interview_type) {
            return res.status(400).json({ message: "role and interview_type are required" });
        }

        if (job_description_id) {
            if (!isValidId(job_description_id)) {
                return res.status(400).json({ message: "Invalid job_description_id" });
            }
            const jdExists = await JobDescription.findOne({
                _id: job_description_id,
                user_id: req.user.id
            });
            if (!jdExists) {
                return res.status(404).json({ message: "Job description not found" });
            }
        }

        const interviewSession = await InterviewSession.create({
            user_id: req.user.id, // taken from the authenticated user, never the request body
            role,
            interview_type,
            job_description_id: job_description_id || undefined
        });

        res.status(201).json(interviewSession);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// Get one session — only if it belongs to the logged-in user
// ---------------------------
const getInterviewSession = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid interview session id" });
        }

        const interviewSession = await InterviewSession.findOne({
            _id: req.params.id,
            user_id: req.user.id
        }).populate("job_description_id");

        if (!interviewSession) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        res.status(200).json(interviewSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// List sessions — always scoped to the logged-in user, never a client-supplied id
// ---------------------------
const getAllInterviewSessions = async (req, res) => {
    try {
        const interviewSessions = await InterviewSession.find({ user_id: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json(interviewSessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// Update session status (e.g. in_progress -> completed/abandoned)
// ---------------------------
const updateInterviewSessionStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid interview session id" });
        }

        const { status } = req.body;
        const validStatuses = ["in_progress", "completed", "abandoned"];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `status must be one of: ${validStatuses.join(", ")}`
            });
        }

        const updates = { status };
        if (status === "completed" || status === "abandoned") {
            updates.ended_at = new Date();
        }

        const interviewSession = await InterviewSession.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            updates,
            { new: true, runValidators: true }
        );

        if (!interviewSession) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        res.status(200).json(interviewSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createInterviewSession,
    getAllInterviewSessions,
    getInterviewSession,
    updateInterviewSessionStatus
};