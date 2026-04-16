const mongoose = require("mongoose");

const learnListingSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    preferredMode: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "online",
    },
    budget: {
      type: Number,
      default: 0,
    },
    availability: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "matched", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearnListing", learnListingSchema);