const mongoose = require("mongoose");

const timestampSchema = new mongoose.Schema(
    {
        start: {
            type: Number,
            required: [true, "start timestamp is required"],
            min: [0, "start timestamp cannot be negative"]
        },
        end: {
            type: Number,
            required: [true, "end timestamp is required"],
            min: [0, "end timestamp cannot be negative"],
            validate: {
                validator: function (value) {
                    return value >= this.start;
                },
                message: "end timestamp must be greater than or equal to start timestamp"
            }
        }
    },
    { _id: false }
);

const nervousHabitSchema = new mongoose.Schema(
    {
        behavior: {
            type: String,
            required: [true, "behavior is required"],
            trim: true
        },
        severity: {
            type: String,
            required: [true, "severity is required"],
            trim: true
        },
        timestamps: [timestampSchema]
    },
    { _id: false }
);

const notableMomentSchema = new mongoose.Schema(
    {
        timestamp: {
            type: Number,
            required: [true, "timestamp is required"],
            min: [0, "timestamp cannot be negative"]
        },
        observation: {
            type: String,
            required: [true, "observation is required"],
            trim: true
        }
    },
    { _id: false }
);

const bodyLanguageAnalysisSchema = new mongoose.Schema(
    {
        answer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Answer",
            required: [true, "answer_id is required"],
            unique: true // ER diagram: Answer —has→ BodyLanguageAnalysis is 1:0..1
        },
        eye_contact_score: {
            type: Number,
            required: [true, "eye_contact_score is required"],
            min: [0, "eye_contact_score cannot be negative"],
            max: [100, "eye_contact_score cannot exceed 100"]
        },
        posture_score: {
            type: Number,
            required: [true, "posture_score is required"],
            min: [0, "posture_score cannot be negative"],
            max: [100, "posture_score cannot exceed 100"]
        },
        facial_expression_score: {
            type: Number,
            required: [true, "facial_expression_score is required"],
            min: [0, "facial_expression_score cannot be negative"],
            max: [100, "facial_expression_score cannot exceed 100"]
        },
        confidence_score: {
            type: Number,
            required: [true, "confidence_score is required"],
            min: [0, "confidence_score cannot be negative"],
            max: [100, "confidence_score cannot exceed 100"]
        },
        nervous_habits_score: {
            type: Number,
            required: [true, "nervous_habits_score is required"],
            min: [0, "nervous_habits_score cannot be negative"],
            max: [100, "nervous_habits_score cannot exceed 100"]
        },
        overall_body_language_score: {
            type: Number,
            required: [true, "overall_body_language_score is required"],
            min: [0, "overall_body_language_score cannot be negative"],
            max: [100, "overall_body_language_score cannot exceed 100"]
        },
        nervous_habits: {
            type: [nervousHabitSchema],
            default: undefined
        },
        strengths: {
            type: [{
                type: String,
                trim: true,
                minlength: [1, "strength cannot be empty"]
            }],
            validate: [
                function (val) { return val.length <= 10; },
                "strengths cannot exceed 10 items"
            ]
        },
        improvement_suggestions: {
            type: [{
                type: String,
                trim: true,
                minlength: [1, "improvement suggestion cannot be empty"]
            }],
            validate: [
                function (val) { return val.length <= 10; },
                "improvement_suggestions cannot exceed 10 items"
            ]
        },
        notable_moments: {
            type: [notableMomentSchema],
            validate: [
                function (val) { return val.length <= 10; },
                "notable_moments cannot exceed 10 items"
            ]
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("BodyLanguageAnalysis", bodyLanguageAnalysisSchema);