const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getUserProfile,
  getPublicUserProfile,
  updateUserProfile,
  searchUserByStudentId,
} = require("../controllers/userController");

router.get("/profile", authMiddleware, getUserProfile);
router.get("/profile/:id", authMiddleware, getPublicUserProfile);
router.get("/search-by-student-id/:studentId", authMiddleware, searchUserByStudentId);
router.put("/profile", authMiddleware, updateUserProfile);

module.exports = router;