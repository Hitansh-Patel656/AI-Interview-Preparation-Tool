const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        session_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InterviewSession",
            required: [true, "session_id is required"]
        },
        parent_question_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            default: null // root questions have no parent — must be optional
        },
        text: {
            type: String,
            required: [true, "text is required"],
            trim: true
        },
        is_followup: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Speeds up "get all questions for this session" and "get follow-ups for this parent"
questionSchema.index({ session_id: 1 });
questionSchema.index({ parent_question_id: 1 });

module.exports = mongoose.model("Question", questionSchema);