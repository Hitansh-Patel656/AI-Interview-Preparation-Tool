const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSession");
const jobDescriptionRepository = require("../repositories/jobDescriptionRepository");
const resumeRepository = require("../repositories/resumeRepository");
const { createQuestionForSession } = require("./questionController");
const { generateInitialQuestion } = require("../services/llm/questionGenerator");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ---------------------------
// R.1.4 - Create a new interview session for the logged-in user
// ---------------------------
const createInterviewSession = async (req, res) => {
    let interviewSession = null;
    try {
        const { role, interview_type, job_description_id } = req.body;

        if (!role || !interview_type) {
            return res.status(400).json({ message: "role and interview_type are required" });
        }

        let jdExists = null;
        if (job_description_id) {
            if (!UUID_REGEX.test(job_description_id)) {
                return res.status(400).json({ message: "Invalid job_description_id" });
            }
            jdExists = await jobDescriptionRepository.findByIdAndUserId(job_description_id, req.user.id);
            if (!jdExists) {
                return res.status(404).json({ message: "Job description not found" });
            }
        }

        interviewSession = await InterviewSession.create({
            user_id: req.user.id, // taken from the authenticated user, never the request body
            role,
            interview_type,
            job_description_id: job_description_id || undefined
        });

        // Gather optional context
        let resume = null;
        try {
            resume = await resumeRepository.findByUserId(req.user.id);
        } catch (err) {
            console.warn("[Session Creation] Could not fetch resume context:", err.message);
        }

        let generatedQuestionData;
        try {
            generatedQuestionData = await generateInitialQuestion({
                role,
                interview_type,
                resume,
                jobDescription: jdExists
            });
        } catch (llmError) {
            console.error("[Session Creation] LLM generation failed:", llmError.message);
            // Mark session as abandoned
            await InterviewSession.findByIdAndUpdate(interviewSession._id, { status: "abandoned" });
            return res.status(500).json({ message: "Failed to generate initial question" });
        }

        // Persist the question
        const question = await createQuestionForSession({
            session_id: interviewSession._id,
            text: generatedQuestionData.question,
            is_followup: false,
            parent_question_id: null
        });

        res.status(201).json({ session: interviewSession, question });
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

        let interviewSession = await InterviewSession.findOne({
            _id: req.params.id,
            user_id: req.user.id
        }).lean();

        if (interviewSession && interviewSession.job_description_id) {
            // Emulate the population of the job description
            interviewSession.job_description = await jobDescriptionRepository.findByIdAndUserId(
                interviewSession.job_description_id,
                req.user.id
            );
        }

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

const completeInterviewSession = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid interview session id" });
        }

        const interviewSession = await InterviewSession.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            { status: "completed", ended_at: new Date() },
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
    updateInterviewSessionStatus,
    completeInterviewSession
};