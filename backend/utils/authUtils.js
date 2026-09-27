const InterviewSession = require("../models/InterviewSession");
const Question = require("../models/Question");
const Answer = require("../models/Answer");

// Returns true if the session exists and is owned by the user
const verifySessionOwner = async (sessionId, userId) => {
    if (!sessionId) return false;
    const session = await InterviewSession.findOne({ _id: sessionId, user_id: userId }).select("_id").lean();
    return !!session;
};

// Returns true if the question exists and belongs to a session owned by the user
const verifyQuestionOwner = async (questionId, userId) => {
    if (!questionId) return false;
    const question = await Question.findById(questionId).select("session_id").lean();
    if (!question) return false;
    return verifySessionOwner(question.session_id, userId);
};

// Returns true if the answer exists and belongs to a question owned by the user
const verifyAnswerOwner = async (answerId, userId) => {
    if (!answerId) return false;
    const answer = await Answer.findById(answerId).select("question_id").lean();
    if (!answer) return false;
    return verifyQuestionOwner(answer.question_id, userId);
};

module.exports = {
    verifySessionOwner,
    verifyQuestionOwner,
    verifyAnswerOwner
};
