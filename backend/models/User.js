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
            // Not required for OAuth-created accounts (R.6.2)
            required: function () {
                return !this.oauthProvider;
            },
            minlength: [8, "Password must be at least 8 characters"],
            select: false // excluded from query results by default
        },

        // --- OAuth (R.6.2) ---
        oauthProvider: {
            type: String,
            enum: ["google", "firebase", "auth0", null],
            default: null
        },
        oauthProviderId: {
            type: String,
            default: null
        },

        // --- Resume (R.1.2) ---
        resume: {
            fileName: String,
            filePath: String,
            parsedData: {
                skills: [String],
                experience: [String],
                projects: [String]
            },
            uploadedAt: Date
        },

       

        // --- Post-Interview Outcomes (R.4) ---
        outcomes: [
            {
                companyName: { type: String, required: true },
                role: { type: String, required: true },
                round: String,
                outcome: {
                    type: String,
                    enum: ["offer", "rejected", "in-progress", "no-response"],
                    required: true
                },
                difficulty: {
                    type: String,
                    enum: ["easy", "medium", "hard"]
                },
                submittedAt: { type: Date, default: Date.now }
            }
        ]
    },
    { timestamps: true }
);

// Hash password before saving, only if it was modified
userSchema.pre("save", async function (next) {
    if (!this.isModified("password_hash") || !this.password_hash) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Same hashing logic for findOneAndUpdate-style updates
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