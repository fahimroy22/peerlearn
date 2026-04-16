const Review = require("../models/Review");
const Session = require("../models/Session");
const User = require("../models/User");

const getTutorBadge = (ratingAvg, ratingCount) => {
  if (ratingCount >= 10 && ratingAvg >= 4.8) return "Top Tutor";
  if (ratingCount >= 5 && ratingAvg >= 4.5) return "Excellent";
  if (ratingCount >= 2 && ratingAvg >= 4.0) return "Trusted";
  return "Beginner";
};

const createReview = async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body;

    if (!sessionId || !rating) {
      return res.status(400).json({
        message: "sessionId and rating are required",
      });
    }

    const numericRating = Number(rating);

    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        message: "Rating must be a number between 1 and 5",
      });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.learner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only learner can submit a review",
      });
    }

    if (session.status !== "completed") {
      return res.status(400).json({
        message: "Session must be completed first",
      });
    }

    const existingReview = await Review.findOne({ session: session._id });

    if (existingReview) {
      return res.status(400).json({
        message: "Review already submitted for this session",
      });
    }

    const review = await Review.create({
      session: session._id,
      reviewer: session.learner,
      reviewee: session.tutor,
      rating: numericRating,
      comment: comment || "",
    });

    const tutorReviews = await Review.find({ reviewee: session.tutor });

    const ratingCount = tutorReviews.length;
    const totalRating = tutorReviews.reduce((sum, item) => sum + item.rating, 0);
    const ratingAvg = ratingCount > 0 ? totalRating / ratingCount : 0;
    const badge = getTutorBadge(ratingAvg, ratingCount);

    await User.findByIdAndUpdate(session.tutor, {
      ratingAvg,
      ratingCount,
      badge,
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate("reviewer", "name email publicId")
      .populate("session", "startTime endTime status")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyReceivedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.user._id })
      .populate("reviewer", "name email publicId")
      .populate("session", "startTime endTime status")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getUserReviews,
  getMyReceivedReviews,
};