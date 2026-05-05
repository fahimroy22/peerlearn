const express = require("express");
const multer = require("multer");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");

const {
  sendRequestMessage,
  getRequestMessages,
  getRequestUnreadCount,
  getMyRequestUnreadCount,
} = require("../controllers/requestMessageController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/", authMiddleware, upload.single("file"), sendRequestMessage);
router.get("/unread-count", authMiddleware, getMyRequestUnreadCount);
router.get("/:requestId/unread-count", authMiddleware, getRequestUnreadCount);
router.get("/:requestId", authMiddleware, getRequestMessages);

module.exports = router;