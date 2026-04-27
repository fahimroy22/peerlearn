const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createLearnListing,
  getLearnListings,
  getMyLearnListings,
  closeLearnListing,
  deleteLearnListing,
} = require("../controllers/learnListingController");

router.post("/", authMiddleware, createLearnListing);
router.get("/", authMiddleware, getLearnListings);
router.get("/my-listings", authMiddleware, getMyLearnListings);
router.patch("/:id/close", authMiddleware, closeLearnListing);
router.delete("/:id", authMiddleware, deleteLearnListing);

module.exports = router;