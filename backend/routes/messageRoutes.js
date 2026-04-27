const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getSessionMessages,
  getUnreadCount,
  getSessionUnreadCount,
} = require("../controllers/messageController");

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

router.post("/", authMiddleware, upload.single("file"), sendMessage);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.get("/:sessionId/unread-count", authMiddleware, getSessionUnreadCount);
router.get("/:sessionId", authMiddleware, getSessionMessages);

module.exports = router;