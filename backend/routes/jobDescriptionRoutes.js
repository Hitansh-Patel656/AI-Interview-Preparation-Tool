const express = require("express");

const{
    createJobDescription,
    getAllJobDescriptions,
    getJobDescription,
    updateJobDescription,
    deleteJobDescription
} = require("../controllers/jobDescriptionController");

const router = express.Router();

router.post("/", createJobDescription);
router.get("/", getAllJobDescriptions);
router.get("/:id", getJobDescription);
router.put(":id", updateJobDescription);
router.delete("/:id", deleteJobDescription);

module.export = router; 