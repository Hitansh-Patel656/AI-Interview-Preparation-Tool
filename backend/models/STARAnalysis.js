const mongoose = require("mongoose");

const STARAnalysisSchema = new mongoose.Schema(
    {
        answer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Answer",
            required: [true, "answer_id is required"],
            unique: true // ER diagram: Answer —has→ STARAnalysis is 1:0..1
        },
        star_compliance_rating: {
            type: Number,
            required: [true, "star_compliance_rating is required"],
            min: [0, "star_compliance_rating cannot be negative"],
            max: [100, "star_compliance_rating cannot exceed 100"]
        },
        suggestions: {
            type: String,
            required: [true, "suggestions is required"],
            trim: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("STARAnalysis", STARAnalysisSchema);