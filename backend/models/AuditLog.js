const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    targetType: {
      type: String,
      default: "",
      trim: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    targetLabel: {
      type: String,
      default: "",
      trim: true,
    },

    details: {
      type: String,
      default: "",
      trim: true,
    },

    // 🔥 CRITICAL ADDITION
    snapshot: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);