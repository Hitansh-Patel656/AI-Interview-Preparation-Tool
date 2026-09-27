// controllers/userController.js
//
// Authentication: email + password only, backed by PostgreSQL via authService + repositories.
// OAuth is not supported for this project.
// Profile / resume / outcomes / progress: still backed by MongoDB User model —
// these will be migrated in a subsequent feature branch.

"use strict";

// Removed Mongoose User model dependency
const authService = require("../services/authService");
const userRepository = require("../repositories/userRepository");

// ---------------------------------------------------------------------------
// R.6.1 - Register
// ---------------------------------------------------------------------------
// Creates a new user in PostgreSQL.
// Password is hashed by authService before reaching the repository.
// ---------------------------------------------------------------------------
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email, and password are required" });
        }
        if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ message: "name must be between 2 and 100 characters" });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email" });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        // Duplicate-email check before attempting insert.
        const existing = await userRepository.findByEmail(email);
        if (existing) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const passwordHash = await authService.hashPassword(password);

        const user = await userRepository.create({
            name: name.trim(),
            email,
            passwordHash,
        });

        // password_hash is not returned by userRepository.create() (SAFE_COLUMNS)
        res.status(201).json({ user });
    } catch (error) {
        // PostgreSQL unique violation (23505) is a safety net;
        // the explicit duplicate check above handles it first.
        if (error.code === "23505") {
            return res.status(409).json({ message: "Email already in use" });
        }
        res.status(500).json({ message: "Registration failed" });
    }
};

// ---------------------------------------------------------------------------
// R.6.2 - Login
// ---------------------------------------------------------------------------
// Authenticates against PostgreSQL users.
// Generates an opaque refresh token (random bytes) and stores its SHA-256 hash.
// Returns both tokens to the client; raw refresh token is never stored.
// ---------------------------------------------------------------------------
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        // Fetch user WITH password_hash for comparison.
        const user = await userRepository.findByEmailWithPassword(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Users without a password_hash cannot log in via email/password.
        if (!user.password_hash) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const match = await authService.comparePassword(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = await authService.issueTokens(user.id);

        // Build safe user object — never include password_hash in the response.
        const { password_hash: _, ...safeUser } = user;

        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
};

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------
// Performs atomic rotation: old token revoked, new token issued.
// The client should replace its stored refresh token with the returned one.
// ---------------------------------------------------------------------------
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "refreshToken is required" });
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await authService.rotateRefreshToken(token);

        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        const status = error.status || 500;
        const message = status === 401 ? error.message : "Token refresh failed";
        res.status(status).json({ message });
    }
};

// ---------------------------------------------------------------------------
// R.6.3 - Logout
// ---------------------------------------------------------------------------
// Revokes the provided refresh token in PostgreSQL.
// Idempotent: repeated logout with the same token is safe.
// Requires the access token (authMiddleware already verified it) so that
// the route is not an open endpoint; the refresh token itself is in the body.
// ---------------------------------------------------------------------------
const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (token) {
            await authService.revokeRefreshToken(token);
        }
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: "Logout failed" });
    }
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
// These handlers have been migrated to PostgreSQL.
// ---------------------------------------------------------------------------
const getProfile = async (req, res) => {
    try {
        const user = await userRepository.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch profile" });
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
            if (req.body.password.length < 8) {
                return res.status(400).json({ message: "Password must be at least 8 characters" });
            }
            updates.passwordHash = await authService.hashPassword(req.body.password);
        }

        const user = await userRepository.updateById(req.user.id, updates);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        if (error.code === "23505") { // PostgreSQL unique violation for email
            return res.status(409).json({ message: "Email already in use" });
        }
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// ---------------------------------------------------------------------------
// Resume — NOT YET MIGRATED
// ---------------------------------------------------------------------------
// Note: These endpoints still depend on the legacy MongoDB User model and will
// fail (CastError) since req.user.id is a PostgreSQL UUID, not a MongoDB ObjectId.
// This is intentionally left for the next feature branch.
const uploadResume = async (req, res) => {
    try {
        res.status(501).json({ message: "Resume upload is temporarily disabled pending PostgreSQL migration" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getResume = async (req, res) => {
    try {
        res.status(501).json({ message: "Resume retrieval is temporarily disabled pending PostgreSQL migration" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------------------------------------------------------
// Outcomes — NOT YET MIGRATED
// ---------------------------------------------------------------------------
// Note: These endpoints still depend on the legacy MongoDB User model and will
// fail (CastError) since req.user.id is a PostgreSQL UUID, not a MongoDB ObjectId.
// This is intentionally left for the next feature branch.
const submitOutcome = async (req, res) => {
    try {
        res.status(501).json({ message: "Outcomes submission is temporarily disabled pending PostgreSQL migration" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOutcomes = async (req, res) => {
    try {
        res.status(501).json({ message: "Outcomes retrieval is temporarily disabled pending PostgreSQL migration" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ---------------------------------------------------------------------------
// Progress Dashboard — NOT YET MIGRATED
// ---------------------------------------------------------------------------
const getProgress = async (req, res) => {
    try {
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
    refreshToken,
    logout,
    getProfile,
    updateProfile,
    uploadResume,
    getResume,
    submitOutcome,
    getOutcomes,
    getProgress,
};