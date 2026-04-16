const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  createExchangeRequest,
  getMyReceivedExchangeRequests,
  getMySentExchangeRequests,
  acceptExchangeRequest,
  rejectExchangeRequest,
} = require("../controllers/exchangeRequestController");

router.post("/", authMiddleware, createExchangeRequest);
router.get("/my-received", authMiddleware, getMyReceivedExchangeRequests);
router.get("/my-sent", authMiddleware, getMySentExchangeRequests);
router.patch("/:id/accept", authMiddleware, acceptExchangeRequest);
router.patch("/:id/reject", authMiddleware, rejectExchangeRequest);

module.exports = router;