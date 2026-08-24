const mongoose = require("mongoose");

const modelAnswerSchema = new mongoose.Schema(
    {
        question_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: [true, "question_id is required"],
            unique: true // ER diagram: Question —has→ ModelAnswer is 1:1
        },
        generated_text: {
            type: String,
            required: [true, "generated_text is required"],
            trim: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ModelAnswer", modelAnswerSchema);