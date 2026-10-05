const mongoose = require("mongoose");
const Answer = require("../models/Answer");
const Question = require("../models/Question");
const InterviewSession = require("../models/InterviewSession");
const STARAnalysis = require("../models/STARAnalysis");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const ModelAnswer = require("../models/ModelAnswer");
const BodyLanguageAnalysis = require("../models/BodyLanguageAnalysis");
const { verifyQuestionOwner, verifyAnswerOwner, verifySessionOwner } = require("../utils/authUtils");
const fs = require("fs/promises");
const { createReadStream, statSync } = require("fs");
const path = require("path");
const jobDescriptionRepository = require("../repositories/jobDescriptionRepository");
const resumeRepository = require("../repositories/resumeRepository");
const { evaluateAnswer } = require("../services/llm/answerEvaluator");
const { evaluateDelivery } = require("../services/delivery/deliveryEvaluator");
const { generateFollowUpQuestion } = require("../services/llm/followUpGenerator");
const { createQuestionForSession: persistQuestion } = require("./questionController");
const DeliveryMetrics = require("../models/DeliveryMetrics");

// Robust directory containment check for video files
const getSafeVideoPath = (videoUrl) => {
    if (!videoUrl) return null;
    const expectedDir = path.resolve(__dirname, "..", "uploads", "videos");
    const rawFilename = path.basename(videoUrl);
    const resolvedPath = path.resolve(expectedDir, rawFilename);
    const relative = path.relative(expectedDir, resolvedPath);
    // Check if relative path points outside expected directory, is absolute (different drive on Windows), or is empty (the directory itself)
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        return null;
    }
    return resolvedPath;
};

// Internal helper to avoid duplicating answer creation logic
const _createAnswerLogic = async (question_id, transcript, audio_url, video_url) => {
    const existingAnswer = await Answer.findOne({ question_id });
    if (existingAnswer) {
        throw { status: 409, message: "An answer already exists for this question" };
    }
    return await Answer.create({ question_id, transcript, audio_url, video_url });
};

const createAnswer = async (req, res) => {
    try {
        const { question_id, transcript, audio_url, video_url } = req.body;

        if (!question_id) {
            return res.status(400).json({ message: "question_id is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(question_id)) {
            return res.status(400).json({ message: "Invalid question_id" });
        }

        const questionExists = await Question.findById(question_id);
        if (!questionExists) {
            return res.status(404).json({ message: "Referenced question does not exist" });
        }

        const isOwner = await verifyQuestionOwner(question_id, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "Referenced question does not exist" });
        }

        const existingAnswer = await Answer.findOne({ question_id });
        if (existingAnswer) {
            return res.status(409).json({ message: "An answer already exists for this question" });
        }

        const answer = await Answer.create({ question_id, transcript, audio_url, video_url });
        res.status(201).json(answer);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An answer already exists for this question" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const getAnswer = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        const answer = await Answer.findById(req.params.id);
        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }

        const isOwner = await verifyAnswerOwner(req.params.id, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "Answer not found" });
        }

        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Direct lookup by question — this is how R.2.2/R.3.x flows will actually fetch it
const getAnswerByQuestion = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.questionId)) {
            return res.status(400).json({ message: "Invalid question id" });
        }

        const answer = await Answer.findOne({ question_id: req.params.questionId });
        if (!answer) {
            return res.status(404).json({ message: "No answer found for this question" });
        }

        const isOwner = await verifyAnswerOwner(answer._id, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "No answer found for this question" });
        }

        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllAnswers = async (req, res) => {
    try {
        const filter = {};

        if (req.query.question_id) {
            if (!mongoose.Types.ObjectId.isValid(req.query.question_id)) {
                return res.status(400).json({ message: "Invalid question_id filter" });
            }
            filter.question_id = req.query.question_id;
            const isOwner = await verifyQuestionOwner(req.query.question_id, req.user.id);
            if (!isOwner) {
                return res.status(200).json([]);
            }
        } else {
            // If no filter is provided, we would need to filter by all questions owned by the user.
            // For now, if no question_id is provided, we should probably throw an error or return []
            // to avoid leaking all answers. But let's return [] to be safe if they don't provide a question_id.
            return res.status(400).json({ message: "question_id filter is required" });
        }

        const answers = await Answer.find(filter).sort({ createdAt: 1 });
        res.status(200).json(answers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Needed because the flow is: create Answer with audio_url first (R.2.1),
// then fill in transcript once STT finishes (R.2.2) — this is not a
// free-form edit, just the completion of the same recording step
const updateAnswerTranscript = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid answer id" });
        }

        if (req.body.transcript === undefined) {
            return res.status(400).json({ message: "transcript is required to update" });
        }

        const isOwner = await verifyAnswerOwner(req.params.id, req.user.id);
        if (!isOwner) {
            return res.status(404).json({ message: "Answer not found" });
        }

        const answer = await Answer.findByIdAndUpdate(
            req.params.id,
            { transcript: req.body.transcript },
            { new: true, runValidators: true }
        );

        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }

        res.status(200).json(answer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createAnswerForSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid session id" });
        }

        const isSessionOwner = await verifySessionOwner(req.params.id, req.user.id);
        if (!isSessionOwner) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const { question_id, transcript, audio_url, video_url, duration_seconds } = req.body;

        if (!question_id) {
            return res.status(400).json({ message: "question_id is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(question_id)) {
            return res.status(400).json({ message: "Invalid question_id" });
        }

        if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
            return res.status(400).json({ message: "transcript is required and must be a non-empty string" });
        }

        const question = await Question.findById(question_id);
        if (!question) {
            return res.status(404).json({ message: "Referenced question does not exist" });
        }

        if (String(question.session_id) !== String(req.params.id)) {
            return res.status(404).json({ message: "Question does not belong to this session" });
        }

        // Ownership of question is transitively proven by owning the session it belongs to
        const answer = await _createAnswerLogic(question_id, transcript, audio_url, video_url);

        let evaluationResult;
        let generatedFollowUp = null;
        let nextQuestion = null;

        try {
            // Load interview context
            const session = await InterviewSession.findById(req.params.id);
            let jdExists = null;
            if (session.job_description_id) {
                jdExists = await jobDescriptionRepository.findByIdAndUserId(session.job_description_id, req.user.id);
            }
            let resume = null;
            try {
                resume = await resumeRepository.findByUserId(req.user.id);
            } catch (err) {
                console.warn("[Answer Evaluation] Could not fetch resume context:", err.message);
            }

            // Call answerEvaluator
            evaluationResult = await evaluateAnswer({
                role: session.role,
                interview_type: session.interview_type,
                question: question.text,
                transcript: transcript,
                resume: resume,
                jobDescription: jdExists
            });

            // Persist evaluation models
            await ContentRelevanceScore.findOneAndUpdate(
                { answer_id: answer._id },
                { score: evaluationResult.content_relevance_score, notes: evaluationResult.content_relevance_notes },
                { upsert: true, new: true, runValidators: true }
            );

            await STARAnalysis.findOneAndUpdate(
                { answer_id: answer._id },
                { star_compliance_rating: evaluationResult.star_rating, suggestions: evaluationResult.star_suggestions },
                { upsert: true, new: true, runValidators: true }
            );

            await ModelAnswer.findOneAndUpdate(
                { question_id: question._id },
                { generated_text: evaluationResult.model_answer },
                { upsert: true, new: true, runValidators: true }
            );

            // Calculate delivery metrics deterministically and with AI (tone)
            const deliveryMetricsResult = await evaluateDelivery({
                transcript: transcript,
                duration_seconds: duration_seconds || 0
            });

            await DeliveryMetrics.findOneAndUpdate(
                { answer_id: answer._id },
                {
                    pace_wpm: deliveryMetricsResult.pace_wpm,
                    filler_word_count: deliveryMetricsResult.filler_word_count,
                    tone: deliveryMetricsResult.tone
                },
                { upsert: true, new: true, runValidators: true }
            );

            // Follow-up generation
            if (evaluationResult.follow_up_required) {
                const existingFollowUp = await Question.findOne({ parent_question_id: question._id });
                if (!existingFollowUp) {
                    generatedFollowUp = await generateFollowUpQuestion({
                        role: session.role,
                        interview_type: session.interview_type,
                        question: question.text,
                        transcript: transcript,
                        evaluation: evaluationResult,
                        resume: resume,
                        jobDescription: jdExists
                    });

                    nextQuestion = await persistQuestion({
                        session_id: session._id,
                        parent_question_id: question._id,
                        text: generatedFollowUp.question,
                        is_followup: true
                    });
                } else {
                    nextQuestion = existingFollowUp;
                }
            }

            res.status(201).json({
                answer,
                evaluation: {
                    content_relevance: {
                        score: evaluationResult.content_relevance_score,
                        notes: evaluationResult.content_relevance_notes
                    },
                    star_analysis: {
                        star_compliance_rating: evaluationResult.star_rating,
                        suggestions: evaluationResult.star_suggestions
                    },
                    model_answer: {
                        generated_text: evaluationResult.model_answer
                    },
                    delivery: deliveryMetricsResult
                },
                next_question: nextQuestion
            });
        } catch (error) {
            console.error("[Answer Evaluation] AI evaluation failed:", error.message);
            return res.status(500).json({ message: "Answer saved, but AI evaluation failed" });
        }
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: "An answer already exists for this question" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

const uploadVideoForSession = async (req, res) => {
    const cleanup = async () => {
        if (req.file) {
            await fs.unlink(req.file.path).catch(err => console.error(`Cleanup failed for ${req.file.path}:`, err));
        }
    };

    try {
        const { sessionId, questionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(questionId)) {
            await cleanup();
            return res.status(400).json({ message: "Invalid session id or question id" });
        }

        const isSessionOwner = await verifySessionOwner(sessionId, req.user.id);
        if (!isSessionOwner) {
            await cleanup();
            return res.status(404).json({ message: "Interview session not found" });
        }

        const question = await Question.findById(questionId);
        if (!question || String(question.session_id) !== String(sessionId)) {
            await cleanup();
            return res.status(404).json({ message: "Question does not belong to this session" });
        }

        const isQuestionOwner = await verifyQuestionOwner(questionId, req.user.id);
        if (!isQuestionOwner) {
            await cleanup();
            return res.status(404).json({ message: "Question not found or unauthorized" });
        }

        const answer = await Answer.findOne({ question_id: questionId });
        if (!answer) {
            await cleanup();
            return res.status(404).json({ message: "Answer not found for this question" });
        }
        const isAnswerOwner = await verifyAnswerOwner(answer._id, req.user.id);
        if (!isAnswerOwner) {
            await cleanup();
            return res.status(404).json({ message: "Answer not found or unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "video file is required" });
        }

        const new_video_url = `/uploads/videos/${req.file.filename}`;

        const old_video_url = answer.video_url;
        answer.video_url = new_video_url;
        await answer.save();

        try {
            await BodyLanguageAnalysis.deleteOne({ answer_id: answer._id });
        } catch (err) {
            console.error(`[Video Replacement] Failed to delete stale BodyLanguageAnalysis for answer ${answer._id}:`, err);
        }

        if (old_video_url) {
            try {
                const oldFilePath = getSafeVideoPath(old_video_url);
                if (oldFilePath) {
                    await fs.unlink(oldFilePath).catch(err => console.error(`Failed to delete old video ${oldFilePath}:`, err));
                }
            } catch (err) {
                console.error("Error resolving old video path:", err);
            }
        }

        res.status(200).json({ video_url: new_video_url });
    } catch (error) {
        await cleanup();
        res.status(500).json({ message: error.message });
    }
};

const streamVideoForSession = async (req, res) => {
    try {
        const { sessionId, questionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ message: "Invalid session id or question id" });
        }

        const isSessionOwner = await verifySessionOwner(sessionId, req.user.id);
        if (!isSessionOwner) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const question = await Question.findById(questionId);
        if (!question || String(question.session_id) !== String(sessionId)) {
            return res.status(404).json({ message: "Question does not belong to this session" });
        }

        const isQuestionOwner = await verifyQuestionOwner(questionId, req.user.id);
        if (!isQuestionOwner) {
            return res.status(404).json({ message: "Question not found or unauthorized" });
        }

        const answer = await Answer.findOne({ question_id: questionId });
        if (!answer) {
            return res.status(404).json({ message: "Answer not found for this question" });
        }

        const isAnswerOwner = await verifyAnswerOwner(answer._id, req.user.id);
        if (!isAnswerOwner) {
            return res.status(404).json({ message: "Answer not found or unauthorized" });
        }

        if (!answer.video_url) {
            return res.status(404).json({ message: "Video not found for this answer" });
        }

        const videoPath = getSafeVideoPath(answer.video_url);

        if (!videoPath) {
            return res.status(400).json({ message: "Invalid video path" });
        }

        let stat;
        try {
            stat = statSync(videoPath);
        } catch (err) {
            return res.status(404).json({ message: "Video file not found on server" });
        }

        const fileSize = stat.size;
        const range = req.headers.range;

        // Determine correct content type based on extension
        const ext = path.extname(videoPath).toLowerCase();
        let contentType = "video/webm";
        if (ext === ".mp4") {
            contentType = "video/mp4";
        }

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            let start = parseInt(parts[0], 10);
            let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            // Handle suffix range (bytes=-1024) meaning last 1024 bytes
            if (isNaN(start) && !isNaN(end)) {
                start = fileSize - end;
                end = fileSize - 1;
                if (start < 0) start = 0;
            }

            if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
                res.status(416).header("Content-Range", `bytes */${fileSize}`).send();
                return;
            }

            const chunksize = (end - start) + 1;
            const fileStream = createReadStream(videoPath, { start, end });

            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": contentType,
            });
            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                "Content-Length": fileSize,
                "Content-Type": contentType,
            });
            createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { transcribeAudio } = require("../services/stt/deepgramService");

const uploadAudioForSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(err => {});
            }
            return res.status(400).json({ message: "Invalid session id" });
        }

        const isOwner = await verifySessionOwner(req.params.id, req.user.id);
        if (!isOwner) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(err => {});
            }
            return res.status(404).json({ message: "Interview session not found" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "audio file is required" });
        }

        let transcript = "";
        let duration = 0;
        try {
            const sttResult = await transcribeAudio(req.file.path);
            transcript = sttResult.transcript;
            duration = sttResult.duration;
        } catch (sttError) {
            await fs.unlink(req.file.path).catch(err => {});
            if (sttError.message === "Empty transcript returned by Deepgram.") {
                return res.status(400).json({ message: "Unintelligible audio or empty transcript" });
            }
            console.error("[Audio Upload] Transcription failed:", sttError.message);
            return res.status(502).json({ message: "Deepgram API failure" });
        }

        const audio_url = `/uploads/audio/${req.file.filename}`;
        res.status(200).json({ transcript, audio_url, duration_seconds: duration });
    } catch (error) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(err => {});
        }
        console.error("[Audio Upload] Unexpected error:", error.message);
        res.status(500).json({ message: "Unexpected server error during audio upload" });
    }
};

module.exports = {
    createAnswer,
    getAnswer,
    getAnswerByQuestion,
    getAllAnswers,
    updateAnswerTranscript,
    createAnswerForSession,
    uploadVideoForSession,
    streamVideoForSession,
    uploadAudioForSession
};
