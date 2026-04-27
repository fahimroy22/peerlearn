const User = require("../models/User");
const TeachListing = require("../models/TeachListing");
const LearnListing = require("../models/LearnListing");
const SkillExchange = require("../models/SkillExchange");
const SupportTicket = require("../models/SupportTicket");
const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  admin,
  action,
  targetType = "",
  targetId = null,
  targetLabel = "",
  details = "",
}) => {
  try {
    if (!admin || !action) return;

    await AuditLog.create({
      admin,
      action,
      targetType,
      targetId,
      targetLabel,
      details,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error.message);
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const [
      users,
      tutors,
      learners,
      blockedUsers,
      teachListings,
      learnListings,
      exchanges,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      recentUsers,
      recentTickets,
      recentTeachListings,
      recentLearnListings,
      recentExchanges,
    ] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      User.countDocuments({ isAdmin: false, role: "tutor" }),
      User.countDocuments({ isAdmin: false, role: "learner" }),
      User.countDocuments({ isAdmin: false, accountStatus: "blocked" }),

      TeachListing.countDocuments(),
      LearnListing.countDocuments(),
      SkillExchange.countDocuments(),

      SupportTicket.countDocuments({ status: "open" }),
      SupportTicket.countDocuments({ status: "in_progress" }),
      SupportTicket.countDocuments({ status: "resolved" }),
      SupportTicket.countDocuments({ status: "closed" }),

      User.find({ isAdmin: false }).select("createdAt").sort({ createdAt: -1 }).limit(300),
      SupportTicket.find().select("createdAt").sort({ createdAt: -1 }).limit(300),
      TeachListing.find().select("createdAt").sort({ createdAt: -1 }).limit(300),
      LearnListing.find().select("createdAt").sort({ createdAt: -1 }).limit(300),
      SkillExchange.find().select("createdAt").sort({ createdAt: -1 }).limit(300),
    ]);

    const buildLast7Days = (items) => {
      const days = [];

      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const key = date.toISOString().slice(0, 10);
        const label = date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });

        days.push({ key, label, count: 0 });
      }

      items.forEach((item) => {
        const key = new Date(item.createdAt).toISOString().slice(0, 10);
        const match = days.find((day) => day.key === key);
        if (match) match.count += 1;
      });

      return days;
    };

    res.json({
      stats: {
        users,
        tutors,
        learners,
        blockedUsers,
        teachListings,
        learnListings,
        exchanges,
        openTickets: openTickets + inProgressTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
      },
      charts: {
        users: buildLast7Days(recentUsers),
        tickets: buildLast7Days(recentTickets),
        teachListings: buildLast7Days(recentTeachListings),
        learnListings: buildLast7Days(recentLearnListings),
        exchanges: buildLast7Days(recentExchanges),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search = "", role = "", status = "" } = req.query;
    const query = {};

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { publicId: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (role) {
      if (role === "admin") {
        query.isAdmin = true;
      } else {
        query.role = role;
        query.isAdmin = { $ne: true };
      }
    }

    if (status) query.accountStatus = status;

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const blockUser = async (req, res) => {
  try {
    const { reason = "" } = req.body;
    const user = await User.findById(req.params.userId || req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    if (user.isAdmin) {
      return res.status(400).json({ message: "Admin account cannot be blocked here" });
    }

    user.accountStatus = "blocked";
    user.blockedReason = reason.trim();
    user.blockedAt = new Date();
    user.activeSessionToken = null;

    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Blocked user",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      details: reason.trim(),
    });

    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      message: "User blocked successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId || req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.accountStatus = "active";
    user.blockedReason = "";
    user.blockedAt = null;

    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Unblocked user",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
    });

    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      message: "User unblocked successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forceLogoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId || req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot force logout yourself" });
    }

    user.activeSessionToken = null;
    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Forced user logout",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
    });

    res.json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSupportTickets = async (req, res) => {
  try {
    const { status = "", priority = "", category = "", search = "" } = req.query;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    if (search.trim()) {
      query.$or = [
        { subject: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
        { priority: { $regex: search.trim(), $options: "i" } },
        { status: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const tickets = await SupportTicket.find(query)
      .populate("user", "name email publicId")
      .populate("assignedAdmin", "name email publicId")
      .sort({ updatedAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId).populate(
      "user",
      "name email publicId"
    );

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    ticket.assignedAdmin = req.user._id;

    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Assigned support ticket",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: `Assigned to ${req.user.name}`,
    });

    res.json({ message: "Support ticket assigned successfully", ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSupportTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid support ticket status" });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    ticket.status = status;

    if (status === "in_progress" && !ticket.assignedAdmin) {
      ticket.assignedAdmin = req.user._id;
    }

    await ticket.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Updated support ticket status",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: `Status changed to ${status}`,
    });

    res.json({
      message: "Support ticket status updated successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resolveSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    ticket.status = "resolved";

    if (!ticket.assignedAdmin) {
      ticket.assignedAdmin = req.user._id;
    }

    await ticket.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Resolved support ticket",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
    });

    res.json({ message: "Support ticket resolved successfully", ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = {};

    if (search.trim()) {
      query.$or = [
        { action: { $regex: search.trim(), $options: "i" } },
        { targetType: { $regex: search.trim(), $options: "i" } },
        { targetLabel: { $regex: search.trim(), $options: "i" } },
        { details: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const logs = await AuditLog.find(query)
      .populate("admin", "name email publicId avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllTeachListingsByAdmin = async (req, res) => {
  try {
    const listings = await TeachListing.find()
      .populate("tutor", "name email publicId department semester accountStatus")
      .populate("hiddenBy", "name email publicId")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllLearnListingsByAdmin = async (req, res) => {
  try {
    const listings = await LearnListing.find()
      .populate("learner", "name email publicId department semester accountStatus")
      .populate("hiddenBy", "name email publicId")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSkillExchangesByAdmin = async (req, res) => {
  try {
    const exchanges = await SkillExchange.find()
      .populate("owner", "name email publicId department semester accountStatus")
      .populate("hiddenBy", "name email publicId")
      .sort({ createdAt: -1 });

    res.json(exchanges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const hideTeachListingByAdmin = async (req, res) => {
  try {
    const { reason = "" } = req.body;
    const listing = await TeachListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Teaching listing not found" });
    }

    listing.status = "hidden";
    listing.adminNote = reason.trim();
    listing.hiddenBy = req.user._id;
    listing.hiddenAt = new Date();

    await listing.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Hid teaching listing",
      targetType: "TeachListing",
      targetId: listing._id,
      targetLabel: listing.skillName,
      details: reason.trim(),
    });

    res.json({
      message: "Teaching listing hidden temporarily",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreTeachListingByAdmin = async (req, res) => {
  try {
    const listing = await TeachListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Teaching listing not found" });
    }

    listing.status = "active";
    listing.adminNote = "";
    listing.hiddenBy = null;
    listing.hiddenAt = null;

    await listing.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Restored teaching listing",
      targetType: "TeachListing",
      targetId: listing._id,
      targetLabel: listing.skillName,
    });

    res.json({
      message: "Teaching listing restored",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const hideLearnListingByAdmin = async (req, res) => {
  try {
    const { reason = "" } = req.body;
    const listing = await LearnListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    listing.previousStatus =
      listing.status && listing.status !== "hidden" ? listing.status : "open";

    listing.status = "hidden";
    listing.adminNote = reason.trim();
    listing.hiddenBy = req.user._id;
    listing.hiddenAt = new Date();

    await listing.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Hid learn listing",
      targetType: "LearnListing",
      targetId: listing._id,
      targetLabel: listing.skillName,
      details: reason.trim(),
    });

    res.json({
      message: "Learn listing hidden temporarily",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreLearnListingByAdmin = async (req, res) => {
  try {
    const listing = await LearnListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    listing.status = listing.previousStatus || "open";
    listing.adminNote = "";
    listing.hiddenBy = null;
    listing.hiddenAt = null;

    await listing.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Restored learn listing",
      targetType: "LearnListing",
      targetId: listing._id,
      targetLabel: listing.skillName,
    });

    res.json({
      message: "Learn listing restored",
      listing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const hideSkillExchangeByAdmin = async (req, res) => {
  try {
    const { reason = "" } = req.body;
    const exchange = await SkillExchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({ message: "Skill exchange not found" });
    }

    exchange.previousStatus =
      exchange.status && exchange.status !== "hidden" ? exchange.status : "open";

    exchange.status = "hidden";
    exchange.adminNote = reason.trim();
    exchange.hiddenBy = req.user._id;
    exchange.hiddenAt = new Date();

    await exchange.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Hid skill exchange",
      targetType: "SkillExchange",
      targetId: exchange._id,
      targetLabel: `${exchange.offerSkill} ↔ ${exchange.wantSkill}`,
      details: reason.trim(),
    });

    res.json({
      message: "Skill exchange hidden temporarily",
      exchange,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreSkillExchangeByAdmin = async (req, res) => {
  try {
    const exchange = await SkillExchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({ message: "Skill exchange not found" });
    }

    exchange.status = exchange.previousStatus || "open";
    exchange.adminNote = "";
    exchange.hiddenBy = null;
    exchange.hiddenAt = null;

    await exchange.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Restored skill exchange",
      targetType: "SkillExchange",
      targetId: exchange._id,
      targetLabel: `${exchange.offerSkill} ↔ ${exchange.wantSkill}`,
    });

    res.json({
      message: "Skill exchange restored",
      exchange,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTeachListingByAdmin = async (req, res) => {
  try {
    const listing = await TeachListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Teaching listing not found" });
    }

    await createAuditLog({
      admin: req.user._id,
      action: "Deleted teaching listing",
      targetType: "TeachListing",
      targetId: listing._id,
      targetLabel: listing.skillName,
    });

    await listing.deleteOne();

    res.json({ message: "Teaching listing deleted by admin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLearnListingByAdmin = async (req, res) => {
  try {
    const listing = await LearnListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Learn listing not found" });
    }

    await createAuditLog({
      admin: req.user._id,
      action: "Deleted learn listing",
      targetType: "LearnListing",
      targetId: listing._id,
      targetLabel: listing.skillName,
    });

    await listing.deleteOne();

    res.json({ message: "Learn listing deleted by admin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSkillExchangeByAdmin = async (req, res) => {
  try {
    const exchange = await SkillExchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({ message: "Skill exchange not found" });
    }

    await createAuditLog({
      admin: req.user._id,
      action: "Deleted skill exchange",
      targetType: "SkillExchange",
      targetId: exchange._id,
      targetLabel: `${exchange.offerSkill} ↔ ${exchange.wantSkill}`,
    });

    await exchange.deleteOne();

    res.json({ message: "Skill exchange deleted by admin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminDashboard,

  getAllUsers,
  blockUser,
  unblockUser,
  forceLogoutUser,

  getAllSupportTickets,
  assignSupportTicket,
  updateSupportTicketStatus,
  resolveSupportTicket,

  getAuditLogs,

  getAllTeachListingsByAdmin,
  getAllLearnListingsByAdmin,
  getAllSkillExchangesByAdmin,

  hideTeachListingByAdmin,
  restoreTeachListingByAdmin,
  hideLearnListingByAdmin,
  restoreLearnListingByAdmin,
  hideSkillExchangeByAdmin,
  restoreSkillExchangeByAdmin,

  deleteTeachListingByAdmin,
  deleteLearnListingByAdmin,
  deleteSkillExchangeByAdmin,
};