const mongoose = require("mongoose");
const FeedbackReport = require("../models/FeedbackReport"); // fixed: was importing itself from controllers
const InterviewSession = require("../models/InterviewSession");

const createFeedbackReport = async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ message: "session_id is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(session_id)) {
            return res.status(400).json({ message: "Invalid session_id" });
        }

        const sessionExists = await InterviewSession.findById(session_id);
        if (!sessionExists) {
            return res.status(404).json({ message: "Referenced interview session does not exist" });
        }

        const existingReport = await FeedbackReport.findOne({ session_id });
        if (existingReport) {
            return res.status(409).json({ message: "A feedback report already exists for this session" });
        }

        const feedbackReport = await FeedbackReport.create({ session_id });
        res.status(201).json(feedbackReport);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "A feedback report already exists for this session" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getFeedbackReport = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid feedback report id" });
        }

        const feedbackReport = await FeedbackReport.findById(req.params.id)
            .populate("session_id");

        if (!feedbackReport) {
            return res.status(404).json({ message: "Feedback report not found" });
        }

        res.status(200).json(feedbackReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lets the frontend fetch the report directly by session, which is
// how R.3.6's "view report after session ends" flow will actually be used
const getFeedbackReportBySession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.sessionId)) {
            return res.status(400).json({ message: "Invalid session id" });
        }

        const feedbackReport = await FeedbackReport.findOne({ session_id: req.params.sessionId });

        if (!feedbackReport) {
            return res.status(404).json({ message: "No feedback report found for this session" });
        }

        res.status(200).json(feedbackReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllFeedbackReports = async (req, res) => {
    try {
        const feedbackReports = await FeedbackReport.find().sort({ generated_at: -1 });
        res.status(200).json(feedbackReports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createFeedbackReport,
    getFeedbackReport,
    getFeedbackReportBySession,
    getAllFeedbackReports
};