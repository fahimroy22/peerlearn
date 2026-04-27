const User = require("../models/User");
const TeachListing = require("../models/TeachListing");

// POST /api/listings
const createListing = async (req, res) => {
  try {
    if (req.user.isAdmin) {
      return res.status(403).json({
        message: "Admin accounts cannot create teaching listings",
      });
    }

    const { skillName, description, level, mode, price } = req.body;

    const listing = await TeachListing.create({
      tutor: req.user._id,
      skillName,
      description,
      level,
      mode,
      price,
    });

    const user = await User.findById(req.user._id);

    if (user && !user.isAdmin && user.role !== "tutor") {
      user.role = "tutor";
      await user.save();
    }

    res.status(201).json({
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/listings
const getListings = async (req, res) => {
  try {
    const listings = await TeachListing.find()
      .populate(
        "tutor",
        "name email department semester role publicId ratingAvg ratingCount badge availability avatar bio teachingStyle"
      )
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/listings/my-listings
const getMyListings = async (req, res) => {
  try {
    const listings = await TeachListing.find({ tutor: req.user._id })
      .populate(
        "tutor",
        "name email department semester role publicId ratingAvg ratingCount badge availability avatar bio teachingStyle"
      )
      .sort({
        createdAt: -1,
      });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/listings/:id
const deleteListing = async (req, res) => {
  try {
    const listing = await TeachListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await listing.deleteOne();

    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createListing,
  getListings,
  getMyListings,
  deleteListing,
};