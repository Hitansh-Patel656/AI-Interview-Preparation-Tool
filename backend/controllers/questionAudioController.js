"use strict";

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs/promises");

const Question = require("../models/Question");
const InterviewSession = require("../models/InterviewSession");
const { generateSpeech } = require("../services/tts/geminiTtsService");

const TTS_DIR = path.join(__dirname, "..", "uploads", "tts");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findOwnedQuestion = async (sessionId, questionId, userId) => {
    const session = await InterviewSession.findOne({
        _id: sessionId,
        user_id: userId
    }).select("_id").lean();

    if (!session) {
        return null;
    }

    return Question.findOne({
        _id: questionId,
        session_id: sessionId
    });
};

const getTtsFilePath = (ttsFileName) => {
    if (!ttsFileName) return null;

    const filename = path.basename(ttsFileName);
    if (!filename || filename === "." || filename === "..") return null;

    return path.join(TTS_DIR, filename);
};

const generateQuestionAudio = async (req, res) => {
    let generatedPath = null;

    try {
        const { sessionId, questionId } = req.params;

        if (!isValidObjectId(sessionId) || !isValidObjectId(questionId)) {
            return res.status(400).json({ message: "Invalid session or question id" });
        }

        const question = await findOwnedQuestion(sessionId, questionId, req.user.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        const audioBuffer = await generateSpeech(question.text);
        await fs.mkdir(TTS_DIR, { recursive: true });

        const filename = `${req.user.id}-${sessionId}-${questionId}-${Date.now()}.wav`;
        generatedPath = path.join(TTS_DIR, filename);
        await fs.writeFile(generatedPath, audioBuffer);

        const audioUrl = `/api/sessions/${sessionId}/questions/${questionId}/audio`;
        const previousAudioPath = getTtsFilePath(question.tts_file_name);

        question.audio_url = audioUrl;
        question.tts_file_name = filename;
        await question.save();

        if (previousAudioPath && previousAudioPath !== generatedPath) {
            await fs.unlink(previousAudioPath).catch(() => {});
        }

        res.status(201).json({
            question_id: question._id,
            audio_url: audioUrl,
            mime_type: "audio/wav"
        });
    } catch (error) {
        if (generatedPath) {
            await fs.unlink(generatedPath).catch(() => {});
        }

        console.error("[Question TTS] Generation failed:", error.message);

        if (error.message.includes("GEMINI_API_KEY is not configured")) {
            return res.status(500).json({ message: "Gemini TTS is not configured" });
        }

        if (error.message.includes("TTS text")) {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: "Failed to generate question audio" });
    }
};

const streamQuestionAudio = async (req, res) => {
    try {
        const { sessionId, questionId } = req.params;

        if (!isValidObjectId(sessionId) || !isValidObjectId(questionId)) {
            return res.status(400).json({ message: "Invalid session or question id" });
        }

        const question = await findOwnedQuestion(sessionId, questionId, req.user.id);
        if (!question || !question.audio_url || !question.tts_file_name) {
            return res.status(404).json({ message: "Question audio not found" });
        }

        const audioPath = getTtsFilePath(question.tts_file_name);
        if (!audioPath) {
            return res.status(404).json({ message: "Question audio not found" });
        }

        try {
            await fs.access(audioPath);
        } catch {
            return res.status(404).json({ message: "Question audio not found" });
        }

        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Cache-Control", "private, no-store");
        return res.sendFile(audioPath);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve question audio" });
    }
};

module.exports = {
    generateQuestionAudio,
    streamQuestionAudio
};
