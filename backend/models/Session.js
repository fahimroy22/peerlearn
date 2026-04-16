const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    sessionType: {
      type: String,
      enum: ["regular", "exchange"],
      default: "regular",
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearnRequest",
      default: null,
    },
    exchangeRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      default: null,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    deliveryMode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    roomUrl: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);