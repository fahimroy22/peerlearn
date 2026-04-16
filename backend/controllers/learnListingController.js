const LearnListing = require("../models/LearnListing");

const createLearnListing = async (req, res) => {
  try {
    const { skillName, description, preferredMode, budget, availability } = req.body;

    if (!skillName || !description) {
      return res.status(400).json({
        message: "skillName and description are required",
      });
    }

    const listing = await LearnListing.create({
      learner: req.user._id,
      skillName,
      description,
      preferredMode: preferredMode || "online",
      budget: budget || 0,
      availability: availability || "",
      status: "open",
    });

    res.status(201).json({
      message: "Learn listing created successfully",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLearnListings = async (req, res) => {
  try {
    const listings = await LearnListing.find({ status: "open" })
      .populate("learner", "name email publicId department semester role")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyLearnListings = async (req, res) => {
  try {
    const listings = await LearnListing.find({ learner: req.user._id })
      .populate("learner", "name email publicId department semester role")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const closeLearnListing = async (req, res) => {
  try {
    const listing = await LearnListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    if (listing.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    listing.status = "closed";
    await listing.save();

    res.json({
      message: "Learn listing closed successfully",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLearnListing = async (req, res) => {
  try {
    const listing = await LearnListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    if (listing.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await listing.deleteOne();

    res.json({
      message: "Learn listing deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createLearnListing,
  getLearnListings,
  getMyLearnListings,
  closeLearnListing,
  deleteLearnListing,
};