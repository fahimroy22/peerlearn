const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createSupportTicket,
  getMySupportTickets,
  getSupportMessages,
  sendSupportMessage,
  getMySupportUnreadCount,
} = require("../controllers/supportController");

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

router.post(
  "/tickets",
  authMiddleware,
  upload.single("file"),
  createSupportTicket
);

router.get("/tickets/my", authMiddleware, getMySupportTickets);
router.get("/tickets/unread-count", authMiddleware, getMySupportUnreadCount);
router.get("/tickets/:ticketId/messages", authMiddleware, getSupportMessages);

router.post(
  "/messages",
  authMiddleware,
  upload.single("file"),
  sendSupportMessage
);

module.exports = router;