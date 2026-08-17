const mongoose=require("mongoose");

const bodyLanguageAnalysisSchema = new mongoose.Schema({
    answer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer'
    },
    eye_contact_score: Number,
    posture_score: Number,
    nervous_habits: String
});

module.exports = mongoose.model("BodyLanguageAnalysis", bodyLanguageAnalysisSchema);
