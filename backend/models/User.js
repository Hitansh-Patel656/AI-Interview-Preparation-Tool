const mongoose=require("mongoose");

const userSchema = new mongoose.Schema({
	name: String,
	email: String,
	password_hash: String
});

module.exports = mongoose.model("User", userSchema);
