const express = require("express");
const multer = require("multer");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");

const {
  sendMessage,
  getSessionMessages,
  getUnreadCount,
  getSessionUnreadCount,
} = require("../controllers/messageController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/", authMiddleware, upload.single("file"), sendMessage);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.get("/:sessionId/unread-count", authMiddleware, getSessionUnreadCount);
router.get("/:sessionId", authMiddleware, getSessionMessages);

module.exports = router;