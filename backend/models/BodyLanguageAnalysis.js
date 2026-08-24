const mongoose = require("mongoose");

const bodyLanguageAnalysisSchema = new mongoose.Schema(
    {
        answer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Answer",
            required: [true, "answer_id is required"],
            unique: true // ER diagram: Answer —has→ BodyLanguageAnalysis is 1:0..1
        },
        eye_contact_score: {
            type: Number,
            required: [true, "eye_contact_score is required"],
            min: [0, "eye_contact_score cannot be negative"],
            max: [100, "eye_contact_score cannot exceed 100"]
        },
        posture_score: {
            type: Number,
            required: [true, "posture_score is required"],
            min: [0, "posture_score cannot be negative"],
            max: [100, "posture_score cannot exceed 100"]
        },
        nervous_habits: {
            type: String,
            required: [true, "nervous_habits is required"],
            trim: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("BodyLanguageAnalysis", bodyLanguageAnalysisSchema);