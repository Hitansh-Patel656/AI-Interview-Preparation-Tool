const mongoose = require("mongoose");

const sttMetadataSchema = new mongoose.Schema(
    {
        audio_url: {
            type: String,
            required: true,
            unique: true
        },
        duration_seconds: {
            type: Number,
            required: true
        },
        user_id: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("SttMetadata", sttMetadataSchema);
