// repositories/refreshTokenRepository.js
// PostgreSQL data-access layer for the refresh_tokens table.
//
// Responsibilities:
//   - All parameterized SQL queries against the refresh_tokens table.
//   - Returns plain row objects — no HTTP/JWT logic here.
//
// IMPORTANT:
//   Raw refresh token strings are NEVER stored or returned here.
//   The caller must hash the token (SHA-256 hex) before passing it to
//   create() or using it with findByTokenHash().
//
// A token is valid when:
//   revoked_at IS NULL  AND  expires_at > NOW()

"use strict";

const { pool } = require("../config/postgres");

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
// Inserts a new refresh-token record.
//
// @param {object} params
// @param {string} params.userId     - PostgreSQL UUID of the owning user
// @param {string} params.tokenHash  - SHA-256 hex hash of the raw token
// @param {Date}   params.expiresAt  - absolute expiry timestamp
// @returns {Promise<object>} the created refresh_token row
// ---------------------------------------------------------------------------
const create = async ({ userId, tokenHash, expiresAt }) => {
    const { rows } = await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, expires_at, created_at, revoked_at`,
        [userId, tokenHash, expiresAt]
    );
    return rows[0];
};

// ---------------------------------------------------------------------------
// findByTokenHash
// ---------------------------------------------------------------------------
// Locates a refresh-token record by its hash.
// Returns the row or null — does NOT filter by validity here so that
// the caller can distinguish between "not found", "revoked", and "expired"
// and return appropriate error messages.
//
// @param {string} tokenHash - SHA-256 hex hash of the raw token
// @returns {Promise<object|null>}
// ---------------------------------------------------------------------------
const findByTokenHash = async (tokenHash) => {
    const { rows } = await pool.query(
        `SELECT id, user_id, expires_at, created_at, revoked_at
         FROM refresh_tokens
         WHERE token_hash = $1`,
        [tokenHash]
    );
    return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// revokeByTokenHash
// ---------------------------------------------------------------------------
// Sets revoked_at to NOW() for the record matching the given token hash.
// Used for single-token revocation (e.g. logout from current device).
//
// @param {string} tokenHash - SHA-256 hex hash of the raw token
// @returns {Promise<object|null>} updated row or null if not found
// ---------------------------------------------------------------------------
const revokeByTokenHash = async (tokenHash) => {
    const { rows } = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL
         RETURNING id, user_id, expires_at, created_at, revoked_at`,
        [tokenHash]
    );
    return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// revokeAllForUser
// ---------------------------------------------------------------------------
// Revokes every active refresh token for a given user.
// Used for "log out from all devices" or password-change scenarios.
//
// @param {string} userId - PostgreSQL UUID of the user
// @returns {Promise<number>} count of rows that were revoked
// ---------------------------------------------------------------------------
const revokeAllForUser = async (userId) => {
    const { rowCount } = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId]
    );
    return rowCount;
};

// ---------------------------------------------------------------------------
// deleteExpiredForUser
// ---------------------------------------------------------------------------
// Hard-deletes expired or revoked token records for a user.
// Useful as a lightweight housekeeping step after login/refresh to
// prevent unbounded table growth.
//
// @param {string} userId - PostgreSQL UUID of the user
// @returns {Promise<number>} count of rows deleted
// ---------------------------------------------------------------------------
const deleteExpiredForUser = async (userId) => {
    const { rowCount } = await pool.query(
        `DELETE FROM refresh_tokens
         WHERE user_id = $1
           AND (expires_at <= NOW() OR revoked_at IS NOT NULL)`,
        [userId]
    );
    return rowCount;
};

module.exports = {
    create,
    findByTokenHash,
    revokeByTokenHash,
    revokeAllForUser,
    deleteExpiredForUser,
};
