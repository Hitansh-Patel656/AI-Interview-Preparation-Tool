const mongoose=require("mongoose");

const deliveryMetricsSchema = new mongoose.Schema({
    answer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer'
    },
    pace_wpm: Number,
    filler_word_count: Number,
    tone: String
});

module.exports = mongoose.model("DeliveryMetrics", deliveryMetricsSchema);
