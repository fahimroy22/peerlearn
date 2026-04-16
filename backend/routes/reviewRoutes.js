const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  createReview,
  getUserReviews,
  getMyReceivedReviews,
} = require("../controllers/reviewController");

router.post("/", authMiddleware, createReview);
router.get("/user/:userId", getUserReviews);
router.get("/my-received", authMiddleware, getMyReceivedReviews);

module.exports = router;