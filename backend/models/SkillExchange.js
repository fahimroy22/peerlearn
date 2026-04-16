const mongoose = require("mongoose");

const availabilitySlotSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      trim: true,
      default: "",
    },
    end: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const availabilityDaySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      required: true,
    },
    slots: {
      type: [availabilitySlotSchema],
      default: [],
    },
  },
  { _id: false }
);

const skillExchangeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    offerSkill: {
      type: String,
      required: true,
      trim: true,
    },
    wantSkill: {
      type: String,
      required: true,
      trim: true,
    },
    offerDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    wantDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    offerLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    wantedLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "any"],
      default: "any",
    },
    mode: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "online",
    },
    availability: {
      type: [availabilityDaySchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "matched", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillExchange", skillExchangeSchema);