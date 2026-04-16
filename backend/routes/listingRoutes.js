const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  createListing,
  getListings,
  getMyListings,
  deleteListing,
} = require("../controllers/listingController");

router.get("/", getListings);
router.get("/my-listings", authMiddleware, getMyListings);
router.post("/", authMiddleware, createListing);
router.delete("/:id", authMiddleware, deleteListing);

module.exports = router;