const mongoose = require("mongoose");

const jobDescriptionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "user_id is required"]
        },
        raw_text: {
            type: String,
            required: [true, "raw_text is required"],
            trim: true,
            minlength: [20, "Job description text seems too short to parse meaningfully"]
        },
        parsed_keywords: {
            type: [String], // array, not a single String — see note below
            default: []
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("JobDescription", jobDescriptionSchema);