"use strict";

const mongoose = require("mongoose");
const path = require("path");
const { statSync } = require("fs");
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");
const { analyzeInterviewVideo } = require("../services/vision/geminiVideoAnalysisService");

// Robust directory containment check for video files
// Mirrors the implementation in answerController.js
const getSafeVideoPath = (videoUrl) => {
    if (!videoUrl) return null;
    const expectedDir = path.resolve(__dirname, "..", "uploads", "videos");
    const rawFilename = path.basename(videoUrl);
    const resolvedPath = path.resolve(expectedDir, rawFilename);
    const relative = path.relative(expectedDir, resolvedPath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        return null;
    }
    return resolvedPath;
};

// Derive MIME type from file extension — consistent with streaming logic
const getMimeTypeFromPath = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
        ".webm": "video/webm",
        ".mp4": "video/mp4",
        ".mpeg": "video/mpeg",
        ".mpg": "video/mpeg",
        ".mov": "video/quicktime"
    };
    return mimeMap[ext] || null;
};

// Shared ownership verification: returns { session, question, answer } or sends error response
const resolveOwnershipChain = async (req, res) => {
    const { sessionId, questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({ message: "Invalid session id" });
        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
        res.status(400).json({ message: "Invalid question id" });
        return null;
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session || String(session.user_id) !== String(req.user.id)) {
        res.status(404).json({ message: "Interview session not found" });
        return null;
    }

    const question = await Question.findById(questionId);
    if (!question || String(question.session_id) !== String(sessionId)) {
        res.status(404).json({ message: "Question not found in this session" });
        return null;
    }

    const answer = await Answer.findOne({ question_id: questionId });
    if (!answer) {
        res.status(404).json({ message: "Answer not found for this question" });
        return null;
    }

    return { session, question, answer };
};

const analyzeVideoForSession = async (req, res) => {
    try {
        const chain = await resolveOwnershipChain(req, res);
        if (!chain) return; // response already sent

        const { session, question, answer } = chain;

        // Check for existing analysis (unique constraint on answer_id)
        const existing = await BodyLanguageAnalysis.findOne({ answer_id: answer._id });
        if (existing) {
            return res.status(409).json({ message: "Body-language analysis already exists for this answer" });
        }

        // Verify video exists on the answer
        if (!answer.video_url) {
            return res.status(400).json({ message: "This answer has no recorded video" });
        }

        // Resolve and validate local video path
        const videoPath = getSafeVideoPath(answer.video_url);
        if (!videoPath) {
            return res.status(400).json({ message: "Invalid video path" });
        }

        // Verify physical file exists
        try {
            statSync(videoPath);
        } catch (err) {
            return res.status(404).json({ message: "Video file not found on server" });
        }

        // Determine MIME type from stored filename
        const mimeType = getMimeTypeFromPath(videoPath);
        if (!mimeType) {
            return res.status(400).json({ message: "Unsupported video format" });
        }

        // Call Gemini video analysis service
        const analysisResult = await analyzeInterviewVideo({
            videoPath,
            mimeType,
            role: session.role,
            interviewType: session.interview_type,
            questionText: question.text,
            transcript: answer.transcript || ""
        });

        // Persist validated analysis
        const bodyLanguageAnalysis = await BodyLanguageAnalysis.create({
            answer_id: answer._id,
            ...analysisResult
        });

        res.status(201).json(bodyLanguageAnalysis);
    } catch (error) {
        // Handle duplicate key (race condition on unique answer_id)
        if (error.code === 11000) {
            return res.status(409).json({ message: "Body-language analysis already exists for this answer" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        console.error("[Video Analysis] Analysis failed:", error.message);
        res.status(500).json({ message: "Video analysis failed" });
    }
};

const getVideoAnalysisForSession = async (req, res) => {
    try {
        const chain = await resolveOwnershipChain(req, res);
        if (!chain) return; // response already sent

        const { answer } = chain;

        const analysis = await BodyLanguageAnalysis.findOne({ answer_id: answer._id });
        if (!analysis) {
            return res.status(404).json({ message: "No body-language analysis found for this answer" });
        }

        res.status(200).json(analysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    analyzeVideoForSession,
    getVideoAnalysisForSession
};
