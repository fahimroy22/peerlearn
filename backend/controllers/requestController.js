const LearnRequest = require("../models/LearnRequest");
const TeachListing = require("../models/TeachListing");
const { createAndEmitNotification } = require("./notificationController");

const sendRequest = async (req, res) => {
  try {
    const { listingId, message } = req.body;

    const listing = await TeachListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.tutor.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot request your own listing" });
    }

    const existingRequest = await LearnRequest.findOne({
      learner: req.user._id,
      tutor: listing.tutor,
      listing: listingId,
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const request = await LearnRequest.create({
      learner: req.user._id,
      tutor: listing.tutor,
      listing: listingId,
      message,
      status: "pending",
    });

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: listing.tutor.toString(),
      actor: req.user._id,
      type: "learn_request",
      title: "New learning request",
      message: `${req.user.name} sent you a learning request.`,
      link: "/requests",
      meta: { requestId: request._id, listingId },
    });

    res.status(201).json({
      message: "Request sent successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySentRequests = async (req, res) => {
  try {
    const requests = await LearnRequest.find({ learner: req.user._id })
      .populate("tutor", "name email publicId ratingAvg ratingCount")
      .populate("listing", "skillName")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyReceivedRequests = async (req, res) => {
  try {
    const requests = await LearnRequest.find({ tutor: req.user._id })
      .populate("learner", "name email publicId")
      .populate("tutor", "name email publicId")
      .populate("listing", "skillName")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const request = await LearnRequest.findById(req.params.id).populate(
      "learner",
      "name email publicId"
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "accepted";
    await request.save();

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: request.learner._id.toString(),
      actor: req.user._id,
      type: "request_accepted",
      title: "Request accepted",
      message: `${req.user.name} accepted your learning request.`,
      link: "/requests",
      meta: { requestId: request._id },
    });

    res.json({
      message: "Request accepted successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const request = await LearnRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "rejected";
    await request.save();

    res.json({
      message: "Request rejected successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendRequest,
  getMySentRequests,
  getMyReceivedRequests,
  acceptRequest,
  rejectRequest,
};