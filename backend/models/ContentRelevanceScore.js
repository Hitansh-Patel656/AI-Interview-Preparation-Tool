const mongoose=require("mongoose");

const contentRelevanceScoreSchema = new mongoose.Schema({
    answer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer'
    },
    score: Number,
    notes: String
});

module.exports = mongoose.model("ContentRelevanceScore", contentRelevanceScoreSchema);
