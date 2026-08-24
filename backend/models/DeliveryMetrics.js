const mongoose = require("mongoose");

const deliveryMetricsSchema = new mongoose.Schema(
    {
        answer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Answer",
            required: [true, "answer_id is required"],
            unique: true // ER diagram: Answer —has→ DeliveryMetrics is 1:0..1
        },
        pace_wpm: {
            type: Number,
            required: [true, "pace_wpm is required"],
            min: [0, "pace_wpm cannot be negative"]
        },
        filler_word_count: {
            type: Number,
            required: [true, "filler_word_count is required"],
            min: [0, "filler_word_count cannot be negative"]
        },
        tone: {
            type: String,
            required: [true, "tone is required"],
            trim: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("DeliveryMetrics", deliveryMetricsSchema);