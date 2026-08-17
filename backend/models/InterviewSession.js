const mongoose=require("mongoose");

const interviewSessionSchema = new mongoose.Schema({

    user_id: { 
		type: mongoose.Schema.Types.ObjectId, 
		ref: 'User'
	},
	role: String,
	interview_type: String,
	job_description_id: {
		type: mogoose.Schema.Types.ObjectId,
		ref: 'JobDescription'
	},
    started_at: Date,
});

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
