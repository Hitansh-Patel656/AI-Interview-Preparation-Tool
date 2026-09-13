const express = require("express");

const {
      createPostInterviewOutcome,
      getAllPostInterviewOutcomes,
      getPostInterviewOutcome,
      updatePostInterviewOutcome,
      deletePostInterviewOutcome
} = require("../controllers/postInterviewOutcomeController");

const router = express.Router();


router.post("/", createPostInterviewOutcome);
router.get("/", getAllPostInterviewOutcomes);
router.get("/:id", getPostInterviewOutcome);
router.put("/:id", updatePostInterviewOutcome);
router.delete("/:id", deletePostInterviewOutcome);

module.exports = router;