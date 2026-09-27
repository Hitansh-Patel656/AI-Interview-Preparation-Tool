// app.js
"use strict";

const express  = require("express");
const dotenv   = require("dotenv");

dotenv.config();

const app             = express();
const mongoose        = require("mongoose");
const connectDB       = require("./config/db");
const { testConnection } = require("./config/postgres");

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Database Initialization ─────────────────────────────────────────────────

// MongoDB — remains a hard startup dependency (existing behaviour preserved).
connectDB();

// PostgreSQL — introduced incrementally.
// A failed PostgreSQL connection emits a warning but does NOT crash the server,
// allowing development to continue while PostgreSQL is being configured.
testConnection()
    .then(() => console.log("PostgreSQL Connected"))
    .catch((err) => {
        console.warn(
            "[PostgreSQL] Connection could not be established:",
            err.message,
            "\n  → Set DATABASE_URL (or PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD) in your .env file."
        );
    });

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/job-descriptions", require("./routes/jobDescriptionRoutes"));

// GET /api/health
// Development-only health check. Reports application and database connectivity
// without exposing any credentials or connection strings.
app.get("/api/health", async (req, res) => {
    const health = {
        status:     "ok",
        timestamp:  new Date().toISOString(),
        postgresql: "disconnected",
        mongodb:    "disconnected",
    };

    // Check PostgreSQL
    try {
        await testConnection();
        health.postgresql = "connected";
    } catch {
        health.postgresql = "disconnected";
        health.status = "degraded";
    }

    // Check MongoDB via Mongoose connection state (1 = connected)
    health.mongodb = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    if (health.mongodb === "disconnected") health.status = "degraded";

    const httpStatus = health.status === "ok" ? 200 : 503;
    res.status(httpStatus).json(health);
});

// ─── Server ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
