const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createTutorOffer,
  getOffersForMyListing,
  getMyOffers,
  acceptTutorOffer,
} = require("../controllers/tutorOfferController");

router.post("/", authMiddleware, createTutorOffer);
router.get("/my-offers", authMiddleware, getMyOffers);
router.get("/listing/:listingId", authMiddleware, getOffersForMyListing);
router.patch("/:offerId/accept", authMiddleware, acceptTutorOffer);

module.exports = router;