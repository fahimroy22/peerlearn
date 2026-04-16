const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  sendRequest,
  getMySentRequests,
  getMyReceivedRequests,
  acceptRequest,
  rejectRequest,
} = require("../controllers/requestController");

router.post("/", authMiddleware, sendRequest);
router.get("/my-sent", authMiddleware, getMySentRequests);
router.get("/my-received", authMiddleware, getMyReceivedRequests);
router.patch("/:id/accept", authMiddleware, acceptRequest);
router.patch("/:id/reject", authMiddleware, rejectRequest);

module.exports = router;