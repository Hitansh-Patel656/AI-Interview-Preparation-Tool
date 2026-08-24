const mongoose = require("mongoose");

const contentRelevanceScoreSchema = new mongoose.Schema(
    {
        answer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Answer",
            required: [true, "answer_id is required"],
            unique: true // ER diagram: Answer —has→ ContentRelevanceScore is 1:0..1
        },
        score: {
            type: Number,
            required: [true, "score is required"],
            min: [0, "score cannot be negative"],
            max: [100, "score cannot exceed 100"]
        },
        notes: {
            type: String,
            required: [true, "notes is required"],
            trim: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ContentRelevanceScore", contentRelevanceScoreSchema);