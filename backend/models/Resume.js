const mongoose=require("mongoose");

const resumeSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    file_url: String,
    parsed_skill: String,
    uploaded_at: Date
});

module.exports = mongoose.model("Resume", resumeSchema);
