const User = require("../models/User");
const TeachListing = require("../models/TeachListing");
const LearnListing = require("../models/LearnListing");
const SkillExchange = require("../models/SkillExchange");
const SupportTicket = require("../models/SupportTicket");
const SupportMessage = require("../models/SupportMessage");
const AuditLog = require("../models/AuditLog");
const { createAndEmitNotification } = require("./notificationController");

const isSuperAdmin = (user) => user?.isAdmin && user?.adminRole === "super_admin";

const createAuditLog = async ({
  admin,
  action,
  targetType = "",
  targetId = null,
  targetLabel = "",
  details = "",
  snapshot = {},
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
      snapshot,
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
      admins,
      blockedAdmins,
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
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ isAdmin: true, accountStatus: "blocked" }),

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
        admins,
        blockedAdmins,
        teachListings,
        learnListings,
        exchanges,
        openTickets,
        activeTickets: openTickets + inProgressTickets,
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
        query.adminRole = "admin";
      } else if (role === "super_admin") {
        query.isAdmin = true;
        query.adminRole = "super_admin";
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

    if (user.adminRole === "super_admin") {
      return res.status(403).json({ message: "Super admin cannot be blocked" });
    }

    if (user.isAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only super admin can block admin accounts",
      });
    }

    user.accountStatus = "blocked";
    user.blockedReason = reason.trim();
    user.blockedAt = new Date();
    user.activeSessionToken = null;

    if (user.isAdmin) {
      user.isSupportAvailable = false;
    }

    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: user.isAdmin ? "Blocked admin" : "Blocked user",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      details: reason.trim(),
      snapshot: user.toObject(),
    });

    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      message: user.isAdmin ? "Admin blocked successfully" : "User blocked successfully",
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

    if (user.isAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only super admin can unblock admin accounts",
      });
    }

    user.accountStatus = "active";
    user.blockedReason = "";
    user.blockedAt = null;

    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: user.isAdmin ? "Unblocked admin" : "Unblocked user",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      snapshot: user.toObject(),
    });

    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      message: user.isAdmin ? "Admin unblocked successfully" : "User unblocked successfully",
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

    if (user.isAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only super admin can force logout admins",
      });
    }

    user.activeSessionToken = null;
    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Forced user logout",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      snapshot: user.toObject(),
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

    if (!isSuperAdmin(req.user)) {
      query.assignedAdmin = req.user._id;
    }

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
      .populate("assignedAdmin", "name email publicId adminRole isSupportAvailable")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

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

    if (ticket.assignedAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "This ticket is already assigned. Only super admin can reassign it.",
      });
    }

    ticket.assignedAdmin = req.user._id;
    ticket.assignedAt = new Date();

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
      snapshot: ticket.toObject(),
    });

    res.json({ message: "Support ticket assigned successfully", ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reassignSupportTicket = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only super admin can reassign support tickets",
      });
    }

    const { adminId } = req.body;

    const ticket = await SupportTicket.findById(req.params.ticketId || req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const admin = await User.findOne({
      _id: adminId,
      isAdmin: true,
      adminRole: { $in: ["admin", "super_admin"] },
      accountStatus: "active",
    });

    if (!admin) {
      return res.status(400).json({ message: "Invalid admin selected" });
    }

    const previousAdmin = ticket.assignedAdmin;

    ticket.assignedAdmin = admin._id;
    ticket.assignedAt = new Date();

    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Reassigned support ticket",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: `Ticket reassigned to ${admin.name}`,
      snapshot: {
        ticket: ticket.toObject(),
        previousAdmin,
        newAdmin: admin._id,
      },
    });

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: admin._id.toString(),
      actor: req.user._id,
      type: "support_ticket_reassigned",
      title: "Support ticket reassigned",
      message: "A support ticket has been assigned to you.",
      link: `/admin/support/${ticket._id}`,
      meta: { ticketId: ticket._id },
    });

    res.json({
      message: "Support ticket reassigned successfully",
      ticket,
    });
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

    const ticket = await SupportTicket.findById(req.params.ticketId || req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const isAssignedAdmin =
      ticket.assignedAdmin &&
      String(ticket.assignedAdmin) === String(req.user._id);

    if (!isAssignedAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only assigned admin or super admin can update this ticket",
      });
    }

    ticket.status = status;

    if (status === "in_progress" && !ticket.assignedAdmin) {
      ticket.assignedAdmin = req.user._id;
      ticket.assignedAt = new Date();
    }

    if (status === "resolved" || status === "closed") {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Updated support ticket status",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: `Status changed to ${status}`,
      snapshot: ticket.toObject(),
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
    const ticket = await SupportTicket.findById(req.params.ticketId || req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const isAssignedAdmin =
      ticket.assignedAdmin &&
      String(ticket.assignedAdmin) === String(req.user._id);

    if (!isAssignedAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only assigned admin or super admin can resolve this ticket",
      });
    }

    ticket.status = "resolved";
    ticket.resolvedAt = new Date();

    if (!ticket.assignedAdmin) {
      ticket.assignedAdmin = req.user._id;
      ticket.assignedAt = new Date();
    }

    await ticket.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Resolved support ticket",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      snapshot: ticket.toObject(),
    });

    res.json({ message: "Support ticket resolved successfully", ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteResolvedSupportTicket = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only super admin can delete support tickets",
      });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId || req.params.id)
      .populate("user", "name email publicId")
      .populate("assignedAdmin", "name email publicId adminRole");

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    if (!["resolved", "closed"].includes(ticket.status)) {
      return res.status(400).json({
        message: "Only resolved or closed tickets can be deleted",
      });
    }

    const messages = await SupportMessage.find({ ticket: ticket._id })
      .populate("sender", "name email publicId")
      .sort({ createdAt: 1 });

    await createAuditLog({
      admin: req.user._id,
      action: "Deleted resolved support ticket",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: "Resolved support ticket deleted by super admin",
      snapshot: {
        ticket: ticket.toObject(),
        messages: messages.map((message) => message.toObject()),
      },
    });

    await SupportMessage.deleteMany({ ticket: ticket._id });
    await ticket.deleteOne();

    res.json({
      message: "Support ticket deleted. Full data saved in audit logs.",
    });
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
      .populate("admin", "name email publicId avatar adminRole")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAuditLog = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        message: "Only super admin can delete audit logs",
      });
    }

    const log = await AuditLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    await log.deleteOne();

    res.json({ message: "Audit log deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminWorkload = async (req, res) => {
  try {
    const admins = await User.find({
      isAdmin: true,
      adminRole: { $in: ["admin", "super_admin"] },
    })
      .select(
        "name email publicId avatar adminRole accountStatus isSupportAvailable maxActiveTickets warnings"
      )
      .sort({ adminRole: -1, createdAt: -1 });

    const workloads = await Promise.all(
      admins.map(async (admin) => {
        const activeTickets = await SupportTicket.countDocuments({
          assignedAdmin: admin._id,
          status: { $in: ["open", "in_progress"] },
        });

        return {
          admin,
          activeTickets,
          maxActiveTickets: admin.maxActiveTickets || 5,
          available:
            admin.accountStatus === "active" &&
            admin.isSupportAvailable &&
            activeTickets < (admin.maxActiveTickets || 5),
          warningsCount: admin.warnings?.length || 0,
        };
      })
    );

    res.json(workloads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMySupportAvailability = async (req, res) => {
  try {
    const { isSupportAvailable } = req.body;

    const user = await User.findById(req.user._id);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    user.isSupportAvailable = Boolean(isSupportAvailable);
    await user.save();

    res.json({
      message: "Support availability updated",
      isSupportAvailable: user.isSupportAvailable,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const promoteToAdmin = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: "Only super admin can promote admins" });
    }

    const user = await User.findById(req.params.userId || req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isAdmin = true;
    user.adminRole = "admin";
    user.isSupportAvailable = true;
    user.maxActiveTickets = user.maxActiveTickets || 5;

    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Promoted user to admin",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      snapshot: user.toObject(),
    });

    res.json({
      message: "User promoted to admin successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const demoteAdmin = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: "Only super admin can demote admins" });
    }

    const user = await User.findById(req.params.userId || req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.adminRole === "super_admin") {
      return res.status(403).json({ message: "Cannot demote super admin" });
    }

    user.isAdmin = false;
    user.adminRole = "none";
    user.isSupportAvailable = false;

    await user.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Demoted admin",
      targetType: "User",
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      snapshot: user.toObject(),
    });

    res.json({
      message: "Admin demoted successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const warnAdmin = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: "Only super admin can warn admins" });
    }

    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ message: "Warning reason is required" });
    }

    const admin = await User.findOne({
      _id: req.params.userId || req.params.id,
      isAdmin: true,
      adminRole: "admin",
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.warnings.push({
      reason: reason.trim(),
      warnedBy: req.user._id,
      warnedAt: new Date(),
    });

    await admin.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Warned admin",
      targetType: "User",
      targetId: admin._id,
      targetLabel: `${admin.name} (${admin.email})`,
      details: reason.trim(),
      snapshot: admin.toObject(),
    });

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: admin._id.toString(),
      actor: req.user._id,
      type: "admin_warning",
      title: "Admin warning",
      message: reason.trim(),
      link: "/admin/warnings",
      meta: { adminId: admin._id },
    });

    res.json({
      message: "Warning sent successfully",
      warnings: admin.warnings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: "Only super admin can update admin settings" });
    }

    const { isSupportAvailable, maxActiveTickets } = req.body;

    const admin = await User.findOne({
      _id: req.params.userId || req.params.id,
      isAdmin: true,
      adminRole: { $in: ["admin", "super_admin"] },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (isSupportAvailable !== undefined) {
      admin.isSupportAvailable = Boolean(isSupportAvailable);
    }

    if (maxActiveTickets !== undefined) {
      const numericLimit = Number(maxActiveTickets);

      if (Number.isNaN(numericLimit) || numericLimit < 1) {
        return res.status(400).json({ message: "maxActiveTickets must be at least 1" });
      }

      admin.maxActiveTickets = numericLimit;
    }

    await admin.save();

    await createAuditLog({
      admin: req.user._id,
      action: "Updated admin settings",
      targetType: "User",
      targetId: admin._id,
      targetLabel: `${admin.name} (${admin.email})`,
      snapshot: admin.toObject(),
    });

    res.json({
      message: "Admin settings updated successfully",
      admin,
    });
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
      snapshot: listing.toObject(),
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
      snapshot: listing.toObject(),
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
      snapshot: listing.toObject(),
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
      snapshot: listing.toObject(),
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
      snapshot: exchange.toObject(),
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
      snapshot: exchange.toObject(),
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
      snapshot: listing.toObject(),
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
      snapshot: listing.toObject(),
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
      snapshot: exchange.toObject(),
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
  reassignSupportTicket,
  updateSupportTicketStatus,
  resolveSupportTicket,
  deleteResolvedSupportTicket,

  getAuditLogs,
  deleteAuditLog,

  getAdminWorkload,
  updateMySupportAvailability,
  promoteToAdmin,
  demoteAdmin,
  warnAdmin,
  updateAdminSettings,

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