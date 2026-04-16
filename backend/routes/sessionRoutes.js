const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  createSession,
  createExchangeSession,
  getMySessions,
  completeSession,
  rescheduleSession,
  cancelSession,
  deleteSession,
  getSessionVerification,
  downloadSessionToken,
} = require("../controllers/sessionController");

router.post("/", authMiddleware, createSession);
router.post("/exchange", authMiddleware, createExchangeSession);
router.get("/my-sessions", authMiddleware, getMySessions);

router.get("/:id/verify", getSessionVerification);
router.get("/:id/token", authMiddleware, downloadSessionToken);

router.patch("/:id/complete", authMiddleware, completeSession);
router.patch("/:id/reschedule", authMiddleware, rescheduleSession);
router.patch("/:id/cancel", authMiddleware, cancelSession);
router.delete("/:id", authMiddleware, deleteSession);

module.exports = router;