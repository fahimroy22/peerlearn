const express = require("express");
const multer = require("multer");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");

const {
  sendExchangeMessage,
  getExchangeMessages,
  getExchangeUnreadCount,
} = require("../controllers/exchangeMessageController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/", authMiddleware, upload.single("file"), sendExchangeMessage);
router.get("/unread-count", authMiddleware, getExchangeUnreadCount);
router.get("/:conversationId", authMiddleware, getExchangeMessages);

module.exports = router;