const mongoose = require("mongoose");

const VALID_METRICS = ["pace", "filler_words", "star_score", "content_score"];

const metricHistorySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "user_id is required"]
        },
        metric_name: {
            type: String,
            required: [true, "metric_name is required"],
            enum: {
                values: VALID_METRICS,
                message: `metric_name must be one of: ${VALID_METRICS.join(", ")}`
            }
        },
        value: {
            type: Number,
            required: [true, "value is required"]
        },
        recorded_at: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Speeds up the dashboard's "give me this user's history for metric X over time" query
metricHistorySchema.index({ user_id: 1, metric_name: 1, recorded_at: 1 });

module.exports = mongoose.model("MetricHistory", metricHistorySchema);