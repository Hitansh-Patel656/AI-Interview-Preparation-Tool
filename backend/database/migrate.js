// database/migrate.js
// Lightweight SQL migration runner for PostgreSQL.
//
// Usage:
//   node backend/database/migrate.js
//
// Behaviour:
//   - Reads all *.sql files from database/migrations/ in filename order.
//   - Skips migrations already recorded in schema_migrations.
//   - Wraps each migration in a transaction — failure rolls back cleanly.
//   - Never exposes DATABASE_URL or credentials in output.
//
// Prerequisites:
//   DATABASE_URL (or individual PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD)
//   must be set in your .env file before running.

"use strict";

require("dotenv").config(); // load .env from backend/ directory

const fs   = require("fs");
const path = require("path");
const { pool } = require("../config/postgres");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

const run = async () => {
    const client = await pool.connect();
    try {
        // Ensure the migrations registry table exists before we query it.
        // migrate.js is the sole owner of this table — SQL files must not
        // create or insert into schema_migrations themselves.
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id          SERIAL      PRIMARY KEY,
                version     VARCHAR(64) NOT NULL UNIQUE,
                description TEXT        NOT NULL DEFAULT '',
                applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // Load the set of already-applied migration versions.
        const { rows: applied } = await client.query(
            "SELECT version FROM schema_migrations"
        );
        const appliedVersions = new Set(applied.map((r) => r.version));

        // Collect and sort migration files (lexicographic order = numeric order).
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith(".sql"))
            .sort();

        let ranCount = 0;

        for (const file of files) {
            // Version key is the filename without the .sql extension.
            const version = path.basename(file, ".sql");

            if (appliedVersions.has(version)) {
                console.log(`[migrate] SKIP  ${file} (already applied)`);
                continue;
            }

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

            await client.query("BEGIN");
            try {
                await client.query(sql);
                // Register the migration — runner is the sole owner of this step.
                await client.query(
                    `INSERT INTO schema_migrations (version, description)
                     VALUES ($1, $2)`,
                    [version, file]
                );
                await client.query("COMMIT");
                console.log(`[migrate] APPLY ${file}`);
                ranCount++;
            } catch (err) {
                await client.query("ROLLBACK");
                console.error(`[migrate] FAIL  ${file}:`, err.message);
                process.exit(1);
            }
        }

        if (ranCount === 0) {
            console.log("[migrate] All migrations are already up to date.");
        } else {
            console.log(`[migrate] ${ranCount} migration(s) applied successfully.`);
        }
    } finally {
        client.release();
    }
};

run()
    .catch((err) => {
        console.error("[migrate] Fatal error:", err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
