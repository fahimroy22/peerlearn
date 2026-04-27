const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getMyExchangeConversations,
  getOrCreateConversationForRequest,
} = require("../controllers/exchangeConversationController");

router.get("/", authMiddleware, getMyExchangeConversations);
router.post("/from-request/:requestId", authMiddleware, getOrCreateConversationForRequest);

module.exports = router;