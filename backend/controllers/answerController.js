const mongoose = require("mongoose");
const Answer = require("../models/Answer");
const Question = require("../models/Question");
const InterviewSession = require("../models/InterviewSession");
const STARAnalysis = require("../models/STARAnalysis");
const ContentRelevanceScore = require("../models/ContentRelevanceScore");
const ModelAnswer = require("../models/ModelAnswer");
const { verifyQuestionOwner, verifyAnswerOwner, verifySessionOwner } = require("../utils/authUtils");
const fs = require("fs/promises");
const jobDescriptionRepository = require("../repositories/jobDescriptionRepository");
const resumeRepository = require("../repositories/resumeRepository");
const { evaluateAnswer } = require("../services/llm/answerEvaluator");
const { generateFollowUpQuestion } = require("../services/llm/followUpGenerator");
const { createQuestionForSession: persistQuestion } = require("./questionController");
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

        const { question_id, transcript, audio_url, video_url } = req.body;

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
                    }
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
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(err => console.error(`Cleanup failed for ${req.file.path}:`, err));
            }
            return res.status(400).json({ message: "Invalid session id" });
        }

        const isOwner = await verifySessionOwner(req.params.id, req.user.id);
        if (!isOwner) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(err => console.error(`Cleanup failed for ${req.file.path}:`, err));
            }
            return res.status(404).json({ message: "Interview session not found" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "video file is required" });
        }

        const video_url = `/uploads/videos/${req.file.filename}`;
        res.status(200).json({ video_url });
    } catch (error) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(err => console.error(`Cleanup failed for ${req.file.path}:`, err));
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAnswer,
    getAnswer,
    getAnswerByQuestion,
    getAllAnswers,
    updateAnswerTranscript,
    createAnswerForSession,
    uploadVideoForSession
};