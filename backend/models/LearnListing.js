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
      enum: ["open", "matched", "closed", "hidden"],
      default: "open",
      index: true,
    },
    previousStatus: {
      type: String,
      enum: ["open", "matched", "closed"],
      default: "open",
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    hiddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    hiddenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearnListing", learnListingSchema);