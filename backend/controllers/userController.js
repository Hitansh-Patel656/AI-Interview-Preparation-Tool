const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "7d";

const signAccessToken = (userId) =>
    jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const signRefreshToken = (userId) =>
    jwt.sign({ sub: userId, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

// ---------------------------
// R.6.1 - Register
// ---------------------------
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email, and password are required" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const user = await User.create({ name, email: email.toLowerCase(), password_hash: password });

        const { password_hash: _, ...safeUser } = user.toObject();
        res.status(201).json({ user: safeUser });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// R.6.2 - Login
// ---------------------------
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        // password_hash must be select:false in schema, so explicitly include it here
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password_hash");
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = signAccessToken(user._id);
        const refreshToken = signRefreshToken(user._id);

        const { password_hash: _, ...safeUser } = user.toObject();
        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// R.6.2 - OAuth callback (Firebase/Auth0)
// ---------------------------
const oauthCallback = async (req, res) => {
    try {
        // Expect the frontend to have already exchanged the code and sent
        // verified profile info (or an id_token to verify server-side).
        const { email, name, providerId, provider } = req.body;

        if (!email || !providerId) {
            return res.status(400).json({ message: "email and providerId are required" });
        }

        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = await User.create({
                name: name || email.split("@")[0],
                email: email.toLowerCase(),
                oauthProvider: provider,
                oauthProviderId: providerId
            });
        }

        const accessToken = signAccessToken(user._id);
        const refreshToken = signRefreshToken(user._id);

        const { password_hash: _, ...safeUser } = user.toObject();
        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// Refresh token
// ---------------------------
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "refreshToken is required" });
        }

        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        if (payload.type !== "refresh") {
            return res.status(401).json({ message: "Invalid token type" });
        }

        const accessToken = signAccessToken(payload.sub);
        res.json({ accessToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// R.6.3 - Logout
// ---------------------------
const logout = async (req, res) => {
    try {
        // If using a token blocklist/session store, invalidate it here.
        // Stateless JWT setups can simply instruct the client to discard tokens.
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// Profile
// ---------------------------
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const allowedUpdates = ["name", "email"];
        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        if (req.body.password) {
            updates.password_hash = req.body.password;
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: "Email already in use" });
        }
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// R.1.2 - Resume upload/parse
// ---------------------------
const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "resume file is required" });
        }

        // Delegate actual text extraction to a parsing service/module.
        // const parsedData = await resumeParserService.parse(req.file);
        const parsedData = { skills: [], experience: [], projects: [] }; // placeholder

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                resume: {
                    fileName: req.file.originalname,
                    filePath: req.file.path,
                    parsedData,
                    uploadedAt: new Date()
                }
            },
            { new: true }
        );

        res.status(201).json({ message: "Resume uploaded and parsed", resume: user.resume });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getResume = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("resume");
        if (!user || !user.resume) {
            return res.status(404).json({ message: "No resume found" });
        }
        res.json(user.resume);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// ---------------------------
// R.4 - Post-interview outcomes
// ---------------------------
const submitOutcome = async (req, res) => {
    try {
        const { companyName, role, round, outcome, difficulty } = req.body;
        if (!companyName || !role || !outcome) {
            return res.status(400).json({ message: "companyName, role, and outcome are required" });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                $push: {
                    outcomes: { companyName, role, round, outcome, difficulty, submittedAt: new Date() }
                }
            },
            { new: true }
        );

        res.status(201).json({ message: "Outcome submitted", outcomes: user.outcomes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOutcomes = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("outcomes");
        res.json(user?.outcomes || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------
// R.5.1 - Progress dashboard
// ---------------------------
const getProgress = async (req, res) => {
    try {
        // In practice this likely queries a separate Sessions/Scores collection
        // keyed by userId rather than living on the User document itself.
        // const progress = await SessionModel.find({ userId: req.user.id });
        const progress = []; // placeholder

        res.json({ sessions: progress });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    register,
    login,
    oauthCallback,
    refreshToken,
    logout,
    getProfile,
    updateProfile,
    uploadResume,
    getResume,
    submitOutcome,
    getOutcomes,
    getProgress
};