const express = require("express");

const {
    createInterviewSession,
    getAllInterviewSessions,
    getInterviewSession,
    updateInterviewSessionStatus,
    completeInterviewSession
} = require("../controllers/interviewSessionController");

const {
    createAnswerForSession,
    uploadVideoForSession,
    uploadAudioForSession
} = require("../controllers/answerController");

const {
    getQuestionsForSession
} = require("../controllers/questionController");

const {
    getFeedbackReportBySession
} = require("../controllers/feedbackReportController");

const { videoUpload, audioUpload } = require("../middleware/uploadMiddleware");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All interview session routes require a logged-in user
router.use(authMiddleware);

router.post("/", createInterviewSession);
router.get("/", getAllInterviewSessions);
router.get("/:id", getInterviewSession);
router.patch("/:id/status", updateInterviewSessionStatus);
router.post("/:id/complete", completeInterviewSession);

// Nested routes
router.get("/:id/questions", getQuestionsForSession);
router.post("/:id/answers", createAnswerForSession);

router.post("/:id/audio", (req, res, next) => {
    audioUpload.single("audio")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadAudioForSession);

router.post("/:id/video", (req, res, next) => {
    videoUpload.single("video")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadVideoForSession);

// Note: getFeedbackReportBySession expects req.params.sessionId based on previous setup,
// so we'll map :sessionId in the route definition to match.
router.get("/:sessionId/feedback", getFeedbackReportBySession);

module.exports = router;