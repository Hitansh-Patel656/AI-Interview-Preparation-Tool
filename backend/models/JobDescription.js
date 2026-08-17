const mongoose=require("mongoose");

const jobDescriptionSchema = new mongoose.Schema({
    
	raw_text: String,
    parsed_keywords: String
});

module.exports = mongoose.model("JobDescription", jobDescriptionSchema);
