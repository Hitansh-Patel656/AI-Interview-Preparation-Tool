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
// Locates a refresh-token record by its hash without locking.
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
// rotateToken
// ---------------------------------------------------------------------------
// Atomically revokes one refresh-token record and inserts a replacement.
//
// Concurrency guarantee:
//   SELECT ... FOR UPDATE acquires an exclusive row-level lock on the token
//   row for the duration of the transaction.  A second concurrent request
//   using the same token hash blocks on the lock; when the first transaction
//   commits, the second reads revoked_at IS NOT NULL and is rejected —
//   exactly one rotation succeeds per token.
//
// @param {object} params
// @param {string} params.tokenHash     - SHA-256 hash of the incoming raw token
// @param {string} params.newTokenHash  - SHA-256 hash of the freshly generated token
// @param {Date}   params.newExpiresAt  - expiry for the new token
//
// @returns {Promise<{ record: object, userId: string }>}
//   record   — the newly inserted refresh_token row
//   userId   — PostgreSQL UUID of the token owner
//
// @throws {Error}  err.status === 401 for all auth failures:
//   "Refresh token not found" | "Refresh token has been revoked" |
//   "Refresh token has expired" | "User no longer exists"
// ---------------------------------------------------------------------------
const rotateToken = async ({ tokenHash, newTokenHash, newExpiresAt }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Lock the token row exclusively for this transaction.
        //    Concurrent requests for the same hash serialize here.
        const { rows: found } = await client.query(
            `SELECT id, user_id, expires_at, revoked_at
             FROM refresh_tokens
             WHERE token_hash = $1
             FOR UPDATE`,
            [tokenHash]
        );

        const record = found[0];

        if (!record) {
            await client.query("ROLLBACK");
            const err = new Error("Refresh token not found");
            err.status = 401;
            throw err;
        }

        // After the first transaction commits, the second concurrent request
        // unblocks here and will see revoked_at populated — correctly rejected.
        if (record.revoked_at !== null) {
            await client.query("ROLLBACK");
            const err = new Error("Refresh token has been revoked");
            err.status = 401;
            throw err;
        }

        if (new Date(record.expires_at) <= new Date()) {
            await client.query("ROLLBACK");
            const err = new Error("Refresh token has expired");
            err.status = 401;
            throw err;
        }

        // 2. Verify the owning user still exists.
        const { rows: users } = await client.query(
            "SELECT id FROM users WHERE id = $1",
            [record.user_id]
        );
        if (!users[0]) {
            await client.query("ROLLBACK");
            const err = new Error("User no longer exists");
            err.status = 401;
            throw err;
        }

        // 3. Revoke the old token.  The WHERE revoked_at IS NULL is a secondary
        //    guard — FOR UPDATE already prevents races, but it documents intent.
        const { rowCount } = await client.query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW()
             WHERE id = $1 AND revoked_at IS NULL`,
            [record.id]
        );
        if (rowCount === 0) {
            // Should not happen under FOR UPDATE, but be defensive.
            await client.query("ROLLBACK");
            const err = new Error("Refresh token has been revoked");
            err.status = 401;
            throw err;
        }

        // 4. Insert the replacement token.
        const { rows: inserted } = await client.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, expires_at, created_at, revoked_at`,
            [record.user_id, newTokenHash, newExpiresAt]
        );

        await client.query("COMMIT");

        return { record: inserted[0], userId: record.user_id };
    } catch (err) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        throw err;
    } finally {
        client.release();
    }
};

// ---------------------------------------------------------------------------
// revokeByTokenHash
// ---------------------------------------------------------------------------
// Sets revoked_at to NOW() for the record matching the given token hash.
// Used for single-token revocation (e.g. logout from current device).
// Idempotent — already-revoked tokens are silently ignored.
//
// @param {string} tokenHash - SHA-256 hex hash of the raw token
// @returns {Promise<object|null>} updated row or null if not found/already revoked
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
// Lightweight housekeeping step after login/refresh to prevent table growth.
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
    rotateToken,
    revokeByTokenHash,
    revokeAllForUser,
    deleteExpiredForUser,
};
