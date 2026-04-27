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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.patch("/profile/password", authMiddleware, updateUserPassword);
router.post("/profile/avatar", authMiddleware, upload.single("avatar"), uploadProfileAvatar);
router.get("/profile/:id", authMiddleware, getPublicUserProfile);
router.get("/search-by-student-id/:studentId", authMiddleware, searchUserByStudentId);

module.exports = router;