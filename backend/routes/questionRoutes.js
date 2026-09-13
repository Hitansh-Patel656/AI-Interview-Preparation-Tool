const express = require("express");

const {
    getAllQuestions,
    getQuestion,
    getFollowUpsForQuestion
} = require("../controllers/questionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All question routes require a logged-in user
router.use(authMiddleware);

// GET /api/questions?session_id=... — list questions for a session you own
router.get("/", getAllQuestions);

// GET /api/questions/:id — get a single question (only if its session is yours)
router.get("/:id", getQuestion);

// GET /api/questions/:id/followups — follow-up questions generated under this one
router.get("/:id/followups", getFollowUpsForQuestion);

module.exports = router;