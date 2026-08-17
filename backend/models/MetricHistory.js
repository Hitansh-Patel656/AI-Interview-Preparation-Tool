const mongoose=require("mongoose");

const metricHistorySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    metric_name: String,
	value: Number,
    recorded_at: Date
});

module.exports = mongoose.model("MetricHistory", metricHistorySchema);
