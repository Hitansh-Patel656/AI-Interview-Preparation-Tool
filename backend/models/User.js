const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name must be under 100 characters"]
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
        },
        password_hash: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false // excluded from query results by default
        }
    },
    { timestamps: true }
);

// Hash password before saving, only if it was modified
userSchema.pre("save", async function (next) {
    if (!this.isModified("password_hash")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Same hashing logic for findByIdAndUpdate-style updates
userSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();
    if (update.password_hash) {
        try {
            const salt = await bcrypt.genSalt(10);
            update.password_hash = await bcrypt.hash(update.password_hash, salt);
            this.setUpdate(update);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password_hash);
};

module.exports = mongoose.model("User", userSchema);