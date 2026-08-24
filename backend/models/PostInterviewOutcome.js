const mongoose = require("mongoose");

const postInterviewOutcomeSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "user_id is required"]
        },
        company_name: {
            type: String,
            required: [true, "company_name is required"],
            trim: true
        },
        role: {
            type: String,
            required: [true, "role is required"],
            trim: true
        },
        round: {
            type: String,
            required: [true, "round is required"],
            trim: true
        },
        outcome: {
            type: String,
            required: [true, "outcome is required"],
            enum: {
                values: ["Offer", "Rejected", "Pending", "Withdrawn"],
                message: "outcome must be one of: Offer, Rejected, Pending, Withdrawn"
            }
        },
        difficulty: {
            type: String,
            required: [true, "difficulty is required"],
            enum: {
                values: ["Easy", "Medium", "Hard"],
                message: "difficulty must be one of: Easy, Medium, Hard"
            }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("PostInterviewOutcome", postInterviewOutcomeSchema);