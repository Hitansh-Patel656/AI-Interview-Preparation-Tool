const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
    {
        question_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: [true, "question_id is required"],
            unique: true // ER diagram: Question —has→ Answer is 1:1
        },
        transcript: {
            type: String,
            default: "",
            trim: true
        },
        audio_url: {
            type: String,
            default: null
        },
        video_url: {
            type: String,
            default: null // only present if optional video capture (R.2.4) was enabled
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Answer", answerSchema);