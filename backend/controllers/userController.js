// controllers/userController.js
//
// Authentication: email + password only, backed by PostgreSQL via authService + repositories.
// OAuth is not supported for this project.
// Profile / resume / outcomes / progress: still backed by MongoDB User model —
// these will be migrated in a subsequent feature branch.

"use strict";

// Removed Mongoose User model dependency
const authService = require("../services/authService");
const userRepository = require("../repositories/userRepository");
const resumeRepository = require("../repositories/resumeRepository");
const outcomeRepository = require("../repositories/outcomeRepository");
const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const STARAnalysis = require("../models/STARAnalysis");
const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");
const DeliveryMetrics = require("../models/DeliveryMetrics");
const fs = require("fs").promises;

// ---------------------------------------------------------------------------
// R.6.1 - Register
// ---------------------------------------------------------------------------
// Creates a new user in PostgreSQL.
// Password is hashed by authService before reaching the repository.
// ---------------------------------------------------------------------------
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email, and password are required" });
        }
        if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ message: "name must be between 2 and 100 characters" });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email" });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        // Duplicate-email check before attempting insert.
        const existing = await userRepository.findByEmail(email);
        if (existing) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const passwordHash = await authService.hashPassword(password);

        const user = await userRepository.create({
            name: name.trim(),
            email,
            passwordHash,
        });

        // password_hash is not returned by userRepository.create() (SAFE_COLUMNS)
        res.status(201).json({ user });
    } catch (error) {
        // PostgreSQL unique violation (23505) is a safety net;
        // the explicit duplicate check above handles it first.
        if (error.code === "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        res.status(500).json({ message: "Registration failed" });
    }
};

// ---------------------------------------------------------------------------
// R.6.2 - Login
// ---------------------------------------------------------------------------
// Authenticates against PostgreSQL users.
// Generates an opaque refresh token (random bytes) and stores its SHA-256 hash.
// Returns both tokens to the client; raw refresh token is never stored.
// ---------------------------------------------------------------------------
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        // Fetch user WITH password_hash for comparison.
        const user = await userRepository.findByEmailWithPassword(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Users without a password_hash cannot log in via email/password.
        if (!user.password_hash) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const match = await authService.comparePassword(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = await authService.issueTokens(user.id);

        // Build safe user object — never include password_hash in the response.
        const { password_hash: _, ...safeUser } = user;

        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
};

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------
// Performs atomic rotation: old token revoked, new token issued.
// The client should replace its stored refresh token with the returned one.
// ---------------------------------------------------------------------------
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "refreshToken is required" });
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await authService.rotateRefreshToken(token);

        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        const status = error.status || 500;
        const message = status === 401 ? error.message : "Token refresh failed";
        res.status(status).json({ message });
    }
};

// ---------------------------------------------------------------------------
// R.6.3 - Logout
// ---------------------------------------------------------------------------
// Revokes the provided refresh token in PostgreSQL.
// Idempotent: repeated logout with the same token is safe.
// Requires the access token (authMiddleware already verified it) so that
// the route is not an open endpoint; the refresh token itself is in the body.
// ---------------------------------------------------------------------------
const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (token) {
            await authService.revokeRefreshToken(token);
        }
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: "Logout failed" });
    }
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
// These handlers have been migrated to PostgreSQL.
// ---------------------------------------------------------------------------
const getProfile = async (req, res) => {
    try {
        const user = await userRepository.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

const updateProfile = async (req, res) => {
    try {
        const allowedUpdates = ["name", "email"];
        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        if (req.body.password) {
            if (req.body.password.length < 8) {
                return res.status(400).json({ message: "Password must be at least 8 characters" });
            }
            updates.passwordHash = await authService.hashPassword(req.body.password);
        }

        const user = await userRepository.updateById(req.user.id, updates);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        if (error.code === "23505") { // PostgreSQL unique violation for email
            return res.status(409).json({ message: "Email already in use" });
        }
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------
const { parseResume } = require("../services/resume/resumeParser");

const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "resume file is required" });
        }

        // Fetch existing resume to know if we need to clean up an old file LATER
        const existingResume = await resumeRepository.findByUserId(req.user.id);

        let parsedData = null;
        try {
            parsedData = await parseResume(req.file.path, req.file.originalname);
        } catch (parseError) {
            // Clean up newly uploaded file if parsing fails so we don't leave bad files around
            fs.unlink(req.file.path).catch((err) => {
                if (err.code !== "ENOENT") console.error("Failed to clean up file after parse error:", err);
            });
            console.error("[Resume Parse Error]:", parseError.message);

            if (parseError.name === 'ResumeUpstreamError') {
                return res.status(502).json({ message: "Upstream parser unavailable or returned invalid data" });
            } else if (parseError.name === 'ResumeParseError') {
                return res.status(400).json({ message: "Failed to parse resume: " + parseError.message });
            } else {
                return res.status(500).json({ message: "Internal server error during resume parsing" });
            }
        }

        const resume = await resumeRepository.upsert(
            req.user.id,
            req.file.originalname,
            req.file.path,
            parsedData
        );

        // Delete old file ONLY AFTER successful database upsert
        if (existingResume && existingResume.filePath && existingResume.filePath !== req.file.path) {
            fs.unlink(existingResume.filePath).catch((err) => {
                if (err.code !== "ENOENT") {
                    console.error("Failed to delete old resume file:", err);
                }
            });
        }

        const { filePath, ...publicResume } = resume;
        res.status(201).json({ message: "Resume uploaded and parsed", resume: publicResume });
    } catch (error) {
        // If DB upsert fails, clean up the newly uploaded file to avoid orphans
        if (req.file) {
            fs.unlink(req.file.path).catch((err) => {
                if (err.code !== "ENOENT") {
                    console.error("Failed to clean up new resume file after DB error:", err);
                }
            });
        }
        res.status(500).json({ message: "Failed to upload resume" });
    }
};

const getResume = async (req, res) => {
    try {
        const resume = await resumeRepository.findByUserId(req.user.id);
        if (!resume) {
            return res.status(404).json({ message: "No resume found" });
        }
        const { filePath, ...publicResume } = resume;
        res.json(publicResume);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve resume" });
    }
};

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------
const submitOutcome = async (req, res) => {
    try {
        const { session_id, companyName, role, round, outcome, difficulty } = req.body;

        if (!session_id || !mongoose.Types.ObjectId.isValid(session_id)) {
            return res.status(400).json({ message: "Valid session_id is required" });
        }

        const session = await InterviewSession.findById(session_id);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (String(session.user_id) !== String(req.user.id)) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (session.status !== "completed") {
            return res.status(400).json({ message: "Outcome can only be created for completed sessions" });
        }

        const validOutcomes = ['offer', 'rejected', 'in-progress', 'no-response'];
        if (outcome && !validOutcomes.includes(outcome)) {
            return res.status(400).json({ message: `outcome must be one of: ${validOutcomes.join(', ')}` });
        }

        const validDifficulties = ['easy', 'medium', 'hard'];
        if (difficulty && !validDifficulties.includes(difficulty)) {
            return res.status(400).json({ message: `difficulty must be one of: ${validDifficulties.join(', ')}` });
        }

        // Aggregate scores
        const questions = await Question.find({ session_id });
        const questionIds = questions.map(q => q._id);
        const answers = await Answer.find({ question_id: { $in: questionIds } });
        const answerIds = answers.map(a => a._id);

        let crTotal = 0, crCount = 0;
        let starTotal = 0, starCount = 0;
        let blTotal = 0, blCount = 0;

        if (answerIds.length > 0) {
            const crScores = await ContentRelevanceScore.find({ answer_id: { $in: answerIds } });
            crScores.forEach(s => { crTotal += s.score; crCount++; });

            const starScores = await STARAnalysis.find({ answer_id: { $in: answerIds } });
            starScores.forEach(s => { starTotal += s.star_compliance_rating; starCount++; });

            const blScores = await BodyLanguageAnalysis.find({ answer_id: { $in: answerIds } });
            blScores.forEach(s => { blTotal += s.overall_body_language_score; blCount++; });
        }

        const crAvg = crCount > 0 ? Math.round(crTotal / crCount) : null;
        const starAvg = starCount > 0 ? Math.round(starTotal / starCount) : null;
        const blAvg = blCount > 0 ? Math.round(blTotal / blCount) : null;

        let overallTotal = 0, overallCount = 0;
        if (crAvg !== null) { overallTotal += crAvg; overallCount++; }
        if (starAvg !== null) { overallTotal += starAvg; overallCount++; }
        if (blAvg !== null) { overallTotal += blAvg; overallCount++; }

        const overall_score = overallCount > 0 ? Math.round(overallTotal / overallCount) : 0;

        const outcomeData = {
            session_id,
            role: session.role,
            interview_type: session.interview_type,
            overall_score,
            content_relevance_score: crAvg,
            star_compliance_score: starAvg,
            body_language_score: blAvg,
            company_name: companyName,
            round,
            real_world_outcome: outcome,
            difficulty,
            completed_at: session.ended_at || new Date()
        };

        const result = await outcomeRepository.create(req.user.id, outcomeData);
        res.status(201).json(result);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: "Outcome already exists for this session" });
        }
        res.status(500).json({ message: "Failed to submit outcome" });
    }
};

const getOutcomes = async (req, res) => {
    try {
        const outcomes = await outcomeRepository.findAllByUserId(req.user.id);
        res.status(200).json(outcomes);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch outcomes" });
    }
};

// ---------------------------------------------------------------------------
// Progress Dashboard
// ---------------------------------------------------------------------------
const getProgress = async (req, res) => {
    try {
        const progress = await outcomeRepository.getProgressByUserId(req.user.id);

        const pace_trend = [];
        const filler_trend = [];
        const star_trend = [];
        const content_trend = [];

        if (progress.history && progress.history.length > 0) {
            const sessionIds = progress.history.map(s => s.session_id);

            // Batch fetch Mongo data
            const questions = await Question.find({ session_id: { $in: sessionIds } });

            // Group questions by session_id
            const sessionQuestions = {};
            questions.forEach(q => {
                const sid = String(q.session_id);
                if (!sessionQuestions[sid]) sessionQuestions[sid] = [];
                sessionQuestions[sid].push(q._id);
            });

            const questionIds = questions.map(q => q._id);
            const answers = await Answer.find({ question_id: { $in: questionIds } });

            // Group answers by question_id
            const questionAnswers = {};
            answers.forEach(a => {
                const qid = String(a.question_id);
                questionAnswers[qid] = a._id;
            });

            const answerIds = answers.map(a => a._id);
            const deliveryMetricsList = await DeliveryMetrics.find({ answer_id: { $in: answerIds } });

            // Map delivery metrics by answer_id
            const deliveryMap = {};
            deliveryMetricsList.forEach(dm => {
                deliveryMap[String(dm.answer_id)] = dm;
            });

            // Reconstruct trends session by session to preserve chronology
            progress.history.forEach(session => {
                const sid = String(session.session_id);
                const date = session.completed_at;

                // Push postgres trends
                if (session.star_compliance_score !== null) {
                    star_trend.push({ session_id: sid, date, value: session.star_compliance_score });
                }
                if (session.content_relevance_score !== null) {
                    content_trend.push({ session_id: sid, date, value: session.content_relevance_score });
                }

                // Aggregate Delivery Metrics for this session
                const qIds = sessionQuestions[sid] || [];
                let sessionPaceTotal = 0;
                let sessionPaceCount = 0;
                let sessionFillerTotal = 0;
                let sessionFillerCount = 0;

                qIds.forEach(qid => {
                    const ansId = questionAnswers[String(qid)];
                    if (ansId && deliveryMap[String(ansId)]) {
                        const dm = deliveryMap[String(ansId)];
                        if (dm.pace_wpm > 0) { // Only average valid pace
                            sessionPaceTotal += dm.pace_wpm;
                            sessionPaceCount++;
                        }
                        if (dm.filler_word_count !== null && dm.filler_word_count !== undefined) {
                            sessionFillerTotal += dm.filler_word_count;
                            sessionFillerCount++;
                        }
                    }
                });

                if (sessionPaceCount > 0) {
                    pace_trend.push({ session_id: sid, date, value: Math.round(sessionPaceTotal / sessionPaceCount) });
                }

                // For filler words, we sum the filler words of all answers in the session,
                // but only if there was at least one answer evaluated for fillers.
                if (sessionFillerCount > 0) {
                    filler_trend.push({ session_id: sid, date, value: sessionFillerTotal });
                }
            });
        }

        res.json({
            stats: {
                total_interviews: parseInt(progress.stats.total_interviews, 10),
                average_score: Math.round(parseFloat(progress.stats.average_score)),
                best_score: parseInt(progress.stats.best_score, 10),
                latest_score: parseInt(progress.stats.latest_score || 0, 10)
            },
            sessions: progress.history,
            pace_trend,
            filler_trend,
            star_trend,
            content_trend
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch progress" });
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getProfile,
    updateProfile,
    uploadResume,
    getResume,
    submitOutcome,
    getOutcomes,
    getProgress,
};
