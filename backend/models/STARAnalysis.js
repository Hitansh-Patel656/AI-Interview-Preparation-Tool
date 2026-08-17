const mongoose=require("mongoose");

const STARAnalysisSchema = new mongoose.Schema({
    answer_id: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Answer'
    },
    star_compliance_rating: Number,
    suggestions: String
});

module.exports = mongoose.model("STARAnalysis", STARAnalysisSchema);
