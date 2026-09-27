// repositories/userRepository.js
// PostgreSQL data-access layer for the users table.
//
// Responsibilities:
//   - All parameterized SQL queries against the users table.
//   - Returns plain row objects — no HTTP/JWT/hashing logic here.
//
// password_hash is NEVER returned by default.
// Callers that need it for authentication must use findByEmailWithPassword().

"use strict";

const { pool } = require("../config/postgres");

// ---------------------------------------------------------------------------
// Column selection
// ---------------------------------------------------------------------------
// Safe columns — excludes password_hash from all default queries.
const SAFE_COLUMNS = `
    id,
    name,
    email,
    oauth_provider,
    oauth_provider_id,
    created_at,
    updated_at
`.trim();

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------
// Returns the user row (without password_hash) or null if not found.
//
// @param {string} id - PostgreSQL UUID string
// @returns {Promise<object|null>}
// ---------------------------------------------------------------------------
const findById = async (id) => {
    const { rows } = await pool.query(
        `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`,
        [id]
    );
    return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// findByEmail
// ---------------------------------------------------------------------------
// Returns the user row (without password_hash) or null if not found.
//
// @param {string} email - lowercased email address
// @returns {Promise<object|null>}
// ---------------------------------------------------------------------------
const findByEmail = async (email) => {
    const { rows } = await pool.query(
        `SELECT ${SAFE_COLUMNS} FROM users WHERE email = $1`,
        [email.toLowerCase()]
    );
    return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// findByEmailWithPassword
// ---------------------------------------------------------------------------
// Returns the full user row INCLUDING password_hash.
// Use ONLY in the login flow where bcrypt comparison is required.
// Never expose the result directly in an HTTP response.
//
// @param {string} email - lowercased email address
// @returns {Promise<object|null>}
// ---------------------------------------------------------------------------
const findByEmailWithPassword = async (email) => {
    const { rows } = await pool.query(
        `SELECT id, name, email, password_hash, oauth_provider, oauth_provider_id,
                created_at, updated_at
         FROM users
         WHERE email = $1`,
        [email.toLowerCase()]
    );
    return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// findByOAuthProvider
// ---------------------------------------------------------------------------
// Locates an existing user by their OAuth provider + provider-specific ID.
// Returns the user row (without password_hash) or null if not found.
//
// @param {string} provider     - e.g. 'google', 'firebase', 'auth0'
// @param {string} providerId   - the provider's own user identifier
// @returns {Promise<object|null>}
// ---------------------------------------------------------------------------
const findByOAuthProvider = async (provider, providerId) => {
    const { rows } = await pool.query(
        `SELECT ${SAFE_COLUMNS} FROM users
         WHERE oauth_provider = $1 AND oauth_provider_id = $2`,
        [provider, providerId]
    );
    return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
// Inserts a new user row.  The caller is responsible for hashing
// password_hash before passing it here — this function stores exactly
// what it receives.
//
// @param {object} params
// @param {string}      params.name
// @param {string}      params.email           - will be lowercased
// @param {string|null} params.passwordHash    - bcrypt hash or null for OAuth
// @param {string|null} params.oauthProvider
// @param {string|null} params.oauthProviderId
// @returns {Promise<object>} the created user row (without password_hash)
// ---------------------------------------------------------------------------
const create = async ({ name, email, passwordHash = null, oauthProvider = null, oauthProviderId = null }) => {
    const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash, oauth_provider, oauth_provider_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${SAFE_COLUMNS}`,
        [name, email.toLowerCase(), passwordHash, oauthProvider, oauthProviderId]
    );
    return rows[0];
};

// ---------------------------------------------------------------------------
// updateById
// ---------------------------------------------------------------------------
// Applies a partial update to a user row.
// Only the fields present in the `updates` object are changed.
// updated_at is maintained automatically by the users_set_updated_at trigger.
//
// Allowed update fields: name, email, passwordHash
// (oauth fields are not updatable here — use a dedicated flow if needed)
//
// @param {string} id
// @param {object} updates  - subset of { name, email, passwordHash }
// @returns {Promise<object|null>} updated user row (without password_hash) or null
// ---------------------------------------------------------------------------
const updateById = async (id, updates) => {
    const setClauses = [];
    const values     = [];
    let   paramIndex = 1;

    if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }
    if (updates.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        values.push(updates.email.toLowerCase());
    }
    if (updates.passwordHash !== undefined) {
        setClauses.push(`password_hash = $${paramIndex++}`);
        values.push(updates.passwordHash);
    }

    if (setClauses.length === 0) return findById(id);

    values.push(id);

    const { rows } = await pool.query(
        `UPDATE users
         SET ${setClauses.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING ${SAFE_COLUMNS}`,
        values
    );
    return rows[0] ?? null;
};

module.exports = {
    findById,
    findByEmail,
    findByEmailWithPassword,
    findByOAuthProvider,
    create,
    updateById,
};
