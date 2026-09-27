// services/authService.js
// Authentication business logic for the AI Interview Preparation Tool.
//
// Authentication methods supported:
//   - Email + password (bcrypt)
//   - JWT access tokens (short-lived)
//   - Opaque refresh tokens (cryptographically random, hashed before storage)
//
// This service does NOT:
//   - handle HTTP requests or responses
//   - contain SQL queries (delegates entirely to repositories)
//   - store raw tokens or raw passwords
//   - log sensitive material
//   - support OAuth providers (not implemented for this project)

"use strict";

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const refreshTokenRepository = require("../repositories/refreshTokenRepository");

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------
const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN     || "1h";
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "7d";

// ---------------------------------------------------------------------------
// parseDurationMs
// ---------------------------------------------------------------------------
// Converts a duration string ("7d", "1h", "30m", "60s") to milliseconds.
// Used to derive the absolute expires_at timestamp stored in PostgreSQL.
// ---------------------------------------------------------------------------
const DURATION_UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

const parseDurationMs = (str) => {
    const match = /^(\d+)([smhd])$/.exec(str);
    if (!match) throw new Error(`Invalid duration format: "${str}"`);
    return parseInt(match[1], 10) * DURATION_UNITS[match[2]];
};

// ---------------------------------------------------------------------------
// hashPassword / comparePassword
// ---------------------------------------------------------------------------
// bcrypt salt rounds: 10 — matches existing project convention.
const BCRYPT_ROUNDS = 10;

const hashPassword = (plainPassword) =>
    bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

const comparePassword = (plainPassword, hash) =>
    bcrypt.compare(plainPassword, hash);

// ---------------------------------------------------------------------------
// signAccessToken
// ---------------------------------------------------------------------------
// Issues a short-lived JWT.
// Payload: { sub: postgresUserUUID }  — nothing else.
// ---------------------------------------------------------------------------
const signAccessToken = (userId) =>
    jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// ---------------------------------------------------------------------------
// generateRefreshToken
// ---------------------------------------------------------------------------
// Returns { rawToken, tokenHash, expiresAt }:
//   rawToken   — 64 hex-char cryptographically random string (returned to client)
//   tokenHash  — SHA-256 hex hash of rawToken (stored in PostgreSQL)
//   expiresAt  — absolute Date for the expires_at column
//
// Never log rawToken or tokenHash.
// ---------------------------------------------------------------------------
const generateRefreshToken = () => {
    const rawToken  = crypto.randomBytes(32).toString("hex"); // 64 hex chars
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + parseDurationMs(REFRESH_EXPIRES_IN));
    return { rawToken, tokenHash, expiresAt };
};

// ---------------------------------------------------------------------------
// hashToken (pure utility)
// ---------------------------------------------------------------------------
// Hashes an incoming raw token the same way generateRefreshToken does.
// Used by the refresh and logout flows to look up the stored record.
// ---------------------------------------------------------------------------
const hashToken = (rawToken) =>
    crypto.createHash("sha256").update(rawToken).digest("hex");

// ---------------------------------------------------------------------------
// issueTokens
// ---------------------------------------------------------------------------
// Issues an access token + refresh token and persists the refresh-token hash.
// Returns { accessToken, refreshToken }.
//
// @param {string} userId - PostgreSQL UUID
// ---------------------------------------------------------------------------
const issueTokens = async (userId) => {
    const accessToken = signAccessToken(userId);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

    await refreshTokenRepository.create({ userId, tokenHash, expiresAt });

    // Fire-and-forget housekeeping — non-fatal if it fails.
    refreshTokenRepository.deleteExpiredForUser(userId).catch(() => {});

    return { accessToken, refreshToken: rawToken };
};

// ---------------------------------------------------------------------------
// rotateRefreshToken
// ---------------------------------------------------------------------------
// Atomically rotates a refresh token using a PostgreSQL row-level lock.
// Delegates the full transaction to refreshTokenRepository.rotateToken(),
// which uses SELECT ... FOR UPDATE to prevent concurrent rotations.
//
// Returns { accessToken, refreshToken } or throws on validation failure.
//
// @param {string} rawToken - the raw refresh token received from the client
// ---------------------------------------------------------------------------
const rotateRefreshToken = async (rawToken) => {
    const { rawToken: newRawToken, tokenHash: newHash, expiresAt: newExpiry } =
        generateRefreshToken();

    const { userId } = await refreshTokenRepository.rotateToken({
        tokenHash:    hashToken(rawToken),
        newTokenHash: newHash,
        newExpiresAt: newExpiry,
    });

    const accessToken = signAccessToken(userId);

    return { accessToken, refreshToken: newRawToken };
};

// ---------------------------------------------------------------------------
// revokeRefreshToken
// ---------------------------------------------------------------------------
// Logout: revokes the single refresh-token record matching the raw token.
// Idempotent — already revoked or missing tokens resolve quietly.
//
// @param {string} rawToken - the raw refresh token received from the client
// ---------------------------------------------------------------------------
const revokeRefreshToken = async (rawToken) => {
    await refreshTokenRepository.revokeByTokenHash(hashToken(rawToken));
};

// ---------------------------------------------------------------------------
// revokeAllUserRefreshTokens
// ---------------------------------------------------------------------------
// All-device logout / password-change: revokes every active token for a user.
//
// @param {string} userId - PostgreSQL UUID
// ---------------------------------------------------------------------------
const revokeAllUserRefreshTokens = async (userId) => {
    await refreshTokenRepository.revokeAllForUser(userId);
};

module.exports = {
    hashPassword,
    comparePassword,
    signAccessToken,
    generateRefreshToken,
    hashToken,
    issueTokens,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserRefreshTokens,
};
