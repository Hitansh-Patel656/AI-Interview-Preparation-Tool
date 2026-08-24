const mongoose = require("mongoose");

const feedbackReportSchema = new mongoose.Schema(
    {
        session_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InterviewSession",
            required: [true, "session_id is required"],
            unique: true // ER diagram shows InterviewSession —generates→ FeedbackReport as 1:1
        },
        generated_at: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("FeedbackReport", feedbackReportSchema);