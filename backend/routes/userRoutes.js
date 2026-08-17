const express = require("express");

const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require("../controllers/userController");

const router = express.Router();

router.post("/", createUser);
router.get("/", getUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;