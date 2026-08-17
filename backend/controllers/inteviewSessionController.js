const InterviewSession = require("../models/InterviewSession");

const createInterviewSession = async (req, res) => {
    try {
        const interviewSession = await InterviewSession.create(req.body);
        res.status(201).json(interviewSession);
    }   catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getInterviewSession = async (req, res) => {
    try {
        const interviewSession = await InterviewSession.findById(req.params.id);
        res.status(200).json(interviewSession);
    }   catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllInterviewSession = async (req, res) => {
    try {
        const interviewSessions = await InterviewSession.find();
        res.status(200).json(interviewSessions);
    }   catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    createInterviewSession,
    getAllInterviewSession,
    getInterviewSession
};