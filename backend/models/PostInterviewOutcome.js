const mongoose=require("mongoose");

const postInterviewOutcomeSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
	company_name: String,
	role: String,
	round: String,
    outcome: String,
    difficulty: String
});

module.exports = mongoose.model("PostInterviewOutcome", PostInterviewOutcomeSchema);
