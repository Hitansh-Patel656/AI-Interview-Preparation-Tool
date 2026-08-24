const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSession");
const User = require("../models/User");
const JobDescription = require("../models/JobDescription");

const createInterviewSession = async (req, res) => {
    try {
        const { user_id, role, interview_type, job_description_id } = req.body;

        if (!user_id || !role || !interview_type) {
            return res.status(400).json({
                message: "user_id, role, and interview_type are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: "Invalid user_id" });
        }

        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "Referenced user does not exist" });
        }

        if (job_description_id) {
            if (!mongoose.Types.ObjectId.isValid(job_description_id)) {
                return res.status(400).json({ message: "Invalid job_description_id" });
            }
            const jdExists = await JobDescription.findById(job_description_id);
            if (!jdExists) {
                return res.status(404).json({ message: "Referenced job description does not exist" });
            }
        }

        const interviewSession = await InterviewSession.create({
            user_id,
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

const getInterviewSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid interview session id" });
        }

        const interviewSession = await InterviewSession.findById(req.params.id)
            .populate("user_id", "name email")
            .populate("job_description_id");

        if (!interviewSession) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        res.status(200).json(interviewSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllInterviewSessions = async (req, res) => {
    try {
        const filter = {};

        
        if (req.query.user_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.user_id)) {
                return res.status(400).json({ message: "Invalid user_id filter" });
            }
            filter.user_id = req.query.user_id;
        }

        const interviewSessions = await InterviewSession.find(filter)
            .populate("user_id", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json(interviewSessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateInterviewSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid interview session id" });
        }

        if (req.body.job_description_id === undefined) {
            return res.status(400).json({ message: "job_description_id is required to update" });
        }

        if (!mongoose.Types.ObjectId.isValid(req.body.job_description_id)) {
            return res.status(400).json({ message: "Invalid job_description_id" });
        }

        const jdExists = await JobDescription.findById(req.body.job_description_id);
        if (!jdExists) {
            return res.status(404).json({ message: "Referenced job description does not exist" });
        }

        const interviewSession = await InterviewSession.findByIdAndUpdate(
            req.params.id,
            { job_description_id: req.body.job_description_id },
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

const deleteInterviewSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid interview session id" });
        }

        const interviewSession = await InterviewSession.findByIdAndDelete(req.params.id);
        if (!interviewSession) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        // See cascade-delete note below — deliberately not cascading here yet
        res.status(200).json({ message: "Interview session deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const updateInterviewSessionStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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

        const interviewSession = await InterviewSession.findByIdAndUpdate(
            req.params.id,
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
    updateInterviewSession,
    deleteInterviewSession
};