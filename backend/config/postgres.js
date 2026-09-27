// config/postgres.js
// Reusable PostgreSQL connection pool using the official `pg` driver.
//
// Configuration priority:
//   1. DATABASE_URL  (preferred — single connection string)
//   2. Individual PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD vars
//
// The pool is exported as a singleton so all modules share one connection pool.
// Credentials are never logged or exposed in responses.

"use strict";

const { Pool } = require("pg");

// Build pool configuration from environment variables only.
// No credentials are hardcoded here.
const poolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          // Enable SSL for cloud-hosted PostgreSQL; disable for local dev.
          // Set DATABASE_SSL=true in your .env when connecting to a remote host.
          ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
      }
    : {
          host:     process.env.PGHOST     || "localhost",
          port:     parseInt(process.env.PGPORT || "5432", 10),
          database: process.env.PGDATABASE,
          user:     process.env.PGUSER,
          password: process.env.PGPASSWORD,
          ssl:      process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
      };

const pool = new Pool(poolConfig);

// Log pool-level errors so they do not go silently unhandled.
// The error message is safe to log; it does not contain credentials.
pool.on("error", (err) => {
    console.error("[PostgreSQL] Unexpected pool error:", err.message);
});

/**
 * Verifies the PostgreSQL connection by executing a lightweight query.
 * Resolves if the connection succeeds; rejects with an Error if it does not.
 * Credentials are never included in thrown errors or console output.
 *
 * @returns {Promise<void>}
 */
const testConnection = async () => {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
    } finally {
        client.release();
    }
};

module.exports = { pool, testConnection };
