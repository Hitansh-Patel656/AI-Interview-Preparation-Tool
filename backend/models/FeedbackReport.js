const mongoose=require("mongoose");

const feedbackReportSchema = new mongoose.Schema({
    session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession'
    },
    generated_at: Date
});

module.exports = mongoose.model("FeedbackReport", feedbackReportSchema);
