const express = require("express");

const {
    createInterviewSession,
    getAllInterviewSessions,
    getInterviewSession,
    updateInterviewSessionStatus
} = require("../controllers/interviewSessionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All interview session routes require a logged-in user
router.use(authMiddleware);

router.post("/", createInterviewSession);
router.get("/", getAllInterviewSessions);
router.get("/:id", getInterviewSession);
router.patch("/:id/status", updateInterviewSessionStatus);

module.exports = router;