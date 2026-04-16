const mongoose = require("mongoose");

const availabilitySlotSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
      trim: true,
    },
    end: {
      type: String,
      required: true,
      trim: true,
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

const userSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{8}$/, "Student ID must be exactly 8 digits"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      default: "",
    },
    semester: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["learner", "tutor", "admin"],
      default: "learner",
    },
    activeSessionToken: {
      type: String,
      default: null,
    },
    ratingAvg: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    badge: {
      type: String,
      default: "Beginner",
    },
    avatar: {
      type: String,
      default: "",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    teachingStyle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    availability: {
      type: [availabilityDaySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);