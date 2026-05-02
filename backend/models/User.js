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

const warningSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    warnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    warnedAt: {
      type: Date,
      default: Date.now,
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

    // marketplace role only
    role: {
      type: String,
      enum: ["learner", "tutor"],
      default: "learner",
    },

    // staff/admin access
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // admin hierarchy
    adminRole: {
      type: String,
      enum: ["none", "admin", "super_admin"],
      default: "none",
    },

    // admin support workload
    isSupportAvailable: {
      type: Boolean,
      default: false,
    },

    maxActiveTickets: {
      type: Number,
      default: 5,
      min: 1,
    },

    warnings: {
      type: [warningSchema],
      default: [],
    },

    accountStatus: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    blockedReason: {
      type: String,
      default: "",
      trim: true,
    },

    blockedAt: {
      type: Date,
      default: null,
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