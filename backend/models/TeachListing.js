const mongoose = require("mongoose");

const teachListingSchema = new mongoose.Schema(
  {
    tutor: {
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

    level: {
      type: String,
      required: true,
      trim: true,
    },

    mode: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    /* =========================
       ADMIN MODERATION FIELDS
    ========================= */

    // visible to users or hidden by admin
    status: {
      type: String,
      enum: ["active", "hidden"],
      default: "active",
      index: true,
    },

    // reason shown to owner for fixing listing
    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // which admin hid it
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

module.exports = mongoose.model("TeachListing", teachListingSchema);