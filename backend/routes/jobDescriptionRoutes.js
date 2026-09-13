const express = require("express");

const {
    createJobDescription,
    getAllJobDescriptions,
    getJobDescription,
    updateJobDescription,
    deleteJobDescription
} = require("../controllers/jobDescriptionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All job description routes require a logged-in user
router.use(authMiddleware);

router.post("/", createJobDescription);
router.get("/", getAllJobDescriptions);
router.get("/:id", getJobDescription);
router.put("/:id", updateJobDescription);
router.delete("/:id", deleteJobDescription);

module.exports = router;