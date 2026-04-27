const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  sendRequestMessage,
  getRequestMessages,
  getRequestUnreadCount,
  getMyRequestUnreadCount,
} = require("../controllers/requestMessageController");

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

router.post("/", authMiddleware, upload.single("file"), sendRequestMessage);
router.get("/unread-count", authMiddleware, getMyRequestUnreadCount);
router.get("/:requestId/unread-count", authMiddleware, getRequestUnreadCount);
router.get("/:requestId", authMiddleware, getRequestMessages);

module.exports = router;