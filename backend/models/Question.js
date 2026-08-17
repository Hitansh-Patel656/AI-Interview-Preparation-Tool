const mongoose=require("mongoose");

const questionSchema = new mongoose.Schema({
    session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession'
    },
    parent_question_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    },
    text: String,
    is_follow_up: Boolean
});

module.exports = mongoose.model("Question", questionSchema);
