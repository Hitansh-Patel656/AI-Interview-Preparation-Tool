const mongoose = require("mongoose");

const VALID_INTERVIEW_TYPES = ["Technical", "HR", "Behavioral"];

const interviewSessionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "user_id is required"]
        },
        role: {
            type: String,
            required: [true, "role is required"],
            trim: true
        },
        interview_type: {
            type: String,
            required: [true, "interview_type is required"],
            enum: {
                values: VALID_INTERVIEW_TYPES,
                message: "interview_type must be one of: Technical, HR, Behavioral"
            }
        },
        job_description_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JobDescription",
            required: false // per SRS: JD is optional, session must work without it
        },
				status: {
						type: String,
						enum: ["in_progress", "completed", "abandoned"],
						default: "in_progress"
				},

				

        started_at: {
            type: Date,
            default: Date.now
        },

				ended_at: {
    				type: Date
				}
    },
    { timestamps: true }
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);