const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "user_id is required"]
        },
        file_url: {
            type: String,
            required: [true, "file_url is required"],
            trim: true
        },
        parsed_skills: {
            type: [String], // see note below on String vs [String]
            default: []
        },
        uploaded_at: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);