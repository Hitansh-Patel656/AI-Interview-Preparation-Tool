const mongoose=require("mongoose");

const modelAnswerSchema = new mongoose.Schema({
    question_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    },
    generated_text: String
});

module.exports = mongoose.model("ModelAnswer", modelAnswerSchema);
