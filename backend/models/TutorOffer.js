const mongoose = require("mongoose");

const tutorOfferSchema = new mongoose.Schema(
  {
    learnListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearnListing",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    proposedPrice: {
      type: Number,
      default: 0,
    },
    proposedMode: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "online",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

tutorOfferSchema.index({ learnListing: 1, tutor: 1 }, { unique: true });

module.exports = mongoose.model("TutorOffer", tutorOfferSchema);