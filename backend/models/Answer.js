const mongoose=require("mongoose");

const answerSchema = new mongoose.Schema({
    question_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    },
    transcript: String,
    audio_url: String,
    video_url: String
});

module.exports = mongoose.model("Answer", answerSchema);

