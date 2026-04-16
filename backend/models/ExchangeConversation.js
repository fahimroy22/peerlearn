const mongoose = require("mongoose");

const exchangeConversationSchema = new mongoose.Schema(
  {
    exchange: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillExchange",
      required: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      required: true,
    },
    userOne: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userTwo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

exchangeConversationSchema.index({ exchange: 1, request: 1 }, { unique: true });

module.exports = mongoose.model("ExchangeConversation", exchangeConversationSchema);