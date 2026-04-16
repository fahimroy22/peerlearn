const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  sendExchangeMessage,
  getExchangeMessages,
  getExchangeUnreadCount,
} = require("../controllers/exchangeMessageController");

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

router.post("/", authMiddleware, upload.single("file"), sendExchangeMessage);
router.get("/unread-count", authMiddleware, getExchangeUnreadCount);
router.get("/:conversationId", authMiddleware, getExchangeMessages);

module.exports = router;