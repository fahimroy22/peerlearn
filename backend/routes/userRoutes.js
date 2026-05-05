const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  getPublicUserProfile,
  updateUserProfile,
  updateUserPassword,
  uploadProfileAvatar,
  searchUserByStudentId,
} = require("../controllers/userController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (adjust if needed)
  },
});

router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.patch("/profile/password", authMiddleware, updateUserPassword);
router.post("/profile/avatar", authMiddleware, upload.single("avatar"), uploadProfileAvatar);
router.get("/profile/:id", authMiddleware, getPublicUserProfile);
router.get("/search-by-student-id/:studentId", authMiddleware, searchUserByStudentId);

module.exports = router;