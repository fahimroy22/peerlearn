const TutorOffer = require("../models/TutorOffer");
const LearnListing = require("../models/LearnListing");
const TeachListing = require("../models/TeachListing");
const LearnRequest = require("../models/LearnRequest");

const createTutorOffer = async (req, res) => {
  try {
    const { learnListingId, message, proposedPrice, proposedMode } = req.body;

    if (!learnListingId || !message) {
      return res.status(400).json({
        message: "learnListingId and message are required",
      });
    }

    const listing = await LearnListing.findById(learnListingId);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    if (listing.status !== "open") {
      return res.status(400).json({ message: "This learn listing is not open" });
    }

    if (listing.learner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot respond to your own listing" });
    }

    const offer = await TutorOffer.create({
      learnListing: learnListingId,
      tutor: req.user._id,
      message,
      proposedPrice: proposedPrice || 0,
      proposedMode: proposedMode || "online",
      status: "pending",
    });

    const populatedOffer = await TutorOffer.findById(offer._id)
      .populate("tutor", "name email publicId department semester role ratingAvg ratingCount")
      .populate("learnListing");

    res.status(201).json({
      message: "Offer sent successfully",
      offer: populatedOffer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "You have already responded to this learner listing",
      });
    }

    res.status(500).json({ message: error.message });
  }
};

const getOffersForMyListing = async (req, res) => {
  try {
    const listing = await LearnListing.findById(req.params.listingId);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    if (listing.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const offers = await TutorOffer.find({ learnListing: req.params.listingId })
      .populate("tutor", "name email publicId department semester role ratingAvg ratingCount")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOffers = async (req, res) => {
  try {
    const offers = await TutorOffer.find({ tutor: req.user._id })
      .populate({
        path: "learnListing",
        populate: {
          path: "learner",
          select: "name email publicId department semester role",
        },
      })
      .populate("tutor", "name email publicId department semester role ratingAvg ratingCount")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptTutorOffer = async (req, res) => {
  try {
    const offer = await TutorOffer.findById(req.params.offerId).populate("learnListing");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const listing = await LearnListing.findById(offer.learnListing._id);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    if (listing.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (listing.status !== "open") {
      return res.status(400).json({ message: "This listing is no longer open" });
    }

    let teachListing = await TeachListing.findOne({
      tutor: offer.tutor,
      skillName: listing.skillName,
    });

    if (!teachListing) {
      teachListing = await TeachListing.create({
        tutor: offer.tutor,
        skillName: listing.skillName,
        description: `Auto-created from learner listing: ${listing.description}`,
        level: "beginner",
        mode: offer.proposedMode || listing.preferredMode || "online",
        price: offer.proposedPrice || listing.budget || 0,
      });
    }

    let learnRequest = await LearnRequest.findOne({
      learner: listing.learner,
      tutor: offer.tutor,
      listing: teachListing._id,
    });

    if (!learnRequest) {
      learnRequest = await LearnRequest.create({
        learner: listing.learner,
        tutor: offer.tutor,
        listing: teachListing._id,
        message: `Auto-created from learner listing: ${listing.description}`,
        status: "accepted",
      });
    } else {
      learnRequest.status = "accepted";
      await learnRequest.save();
    }

    offer.status = "accepted";
    await offer.save();

    await TutorOffer.updateMany(
      {
        learnListing: listing._id,
        _id: { $ne: offer._id },
      },
      {
        status: "rejected",
      }
    );

    listing.status = "matched";
    await listing.save();

    res.json({
      message: "Tutor selected successfully. Request created automatically.",
      offer,
      request: learnRequest,
      listing: teachListing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTutorOffer,
  getOffersForMyListing,
  getMyOffers,
  acceptTutorOffer,
};