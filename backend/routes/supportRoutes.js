const express = require("express");
const multer = require("multer");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createSupportTicket,
  getMySupportTickets,
  getSupportMessages,
  sendSupportMessage,
  getMySupportUnreadCount,
} = require("../controllers/supportController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

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