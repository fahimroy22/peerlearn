const SupportTicket = require("../models/SupportTicket");
const SupportMessage = require("../models/SupportMessage");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const { createAndEmitNotification } = require("./notificationController");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const detectFileType = (file) => {
  if (!file) return "file";
  if (file.mimetype?.startsWith("image/")) return "image";

  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ];

  if (documentMimeTypes.includes(file.mimetype)) return "document";
  return "file";
};

const getBestAvailableAdmin = async () => {
  const admins = await User.find({
    isAdmin: true,
    adminRole: { $in: ["admin", "super_admin"] },
    accountStatus: "active",
    isSupportAvailable: true,
  });

  if (!admins.length) return null;

  const workloads = await Promise.all(
    admins.map(async (admin) => {
      const activeCount = await SupportTicket.countDocuments({
        assignedAdmin: admin._id,
        status: { $in: ["open", "in_progress"] },
      });

      return {
        admin,
        activeCount,
        maxActiveTickets: admin.maxActiveTickets || 5,
      };
    })
  );

  const availableAdmins = workloads
    .filter((item) => item.activeCount < item.maxActiveTickets)
    .sort((a, b) => a.activeCount - b.activeCount);

  return availableAdmins[0]?.admin || null;
};

const faqReplies = [
  {
    keywords: [
      "forgot password",
      "reset password",
      "can't login",
      "cannot login",
      "login problem",
      "wrong password",
      "invalid email or password",
      "session expired",
      "account blocked",
      "unable to login",
      "cant login",
    ],
    reply:
      "Please double-check your email and password first. If the problem continues, try logging out from other devices or contact support for account recovery help.",
  },
  {
    keywords: [
      "session link",
      "meet link",
      "google meet",
      "room url",
      "cannot join session",
      "can't join session",
      "session issue",
      "join class",
      "session time is wrong",
      "missing link",
      "meet missing",
    ],
    reply:
      "Please open your Sessions page and verify the Google Meet link and session time. If the link is missing or not working, an admin will review the session details for you.",
  },
  {
    keywords: [
      "listing not showing",
      "cannot create listing",
      "can't create listing",
      "listing issue",
      "my listing disappeared",
      "listing not posting",
      "listing missing",
      "listing not visible",
      "cannot post listing",
    ],
    reply:
      "Please make sure all required fields are filled correctly before submitting. If your listing is still missing, an admin will check it manually.",
  },
  {
    keywords: [
      "exchange issue",
      "exchange request",
      "cannot open exchange chat",
      "can't open exchange chat",
      "match missing",
      "exchange not working",
      "exchange post not visible",
      "exchange disappeared",
    ],
    reply:
      "Please check whether the exchange request has been accepted first. If the issue continues, an admin will inspect the exchange record for you.",
  },
  {
    keywords: [
      "bug",
      "page broken",
      "button not working",
      "slow",
      "app problem",
      "error",
      "unexpected",
      "not loading",
      "crash",
    ],
    reply:
      "Thanks for reporting this. Please include the page name, what you clicked, and what happened. An admin will review the issue.",
  },
];

const getAutoReply = (text = "", category = "") => {
  const normalized = text.toLowerCase().trim();
  const normalizedCategory = category.toLowerCase().trim();

  for (const item of faqReplies) {
    if (item.keywords.some((keyword) => normalized.includes(keyword))) {
      return item.reply;
    }
  }

  if (normalizedCategory === "login") {
    return "We received your login issue. Please confirm whether the problem is with password, email, session expiry, or account access. An admin will review it if needed.";
  }

  if (normalizedCategory === "session") {
    return "We received your session issue. Please confirm whether the problem is with the Meet link, session time, or joining the session. An admin will review it if needed.";
  }

  if (normalizedCategory === "listing") {
    return "We received your listing issue. Please confirm whether the problem is creating, updating, or viewing a listing. An admin will review it if needed.";
  }

  if (normalizedCategory === "exchange") {
    return "We received your exchange issue. Please confirm whether the problem is with requests, matching, or opening the exchange chat. An admin will review it if needed.";
  }

  if (normalizedCategory === "bug") {
    return "Thanks for reporting this bug. Please share the page name, what action you took, and what happened. An admin will review it if needed.";
  }

  return "Thanks for contacting support. We’ve received your issue and an admin will review it soon. Please share any extra details or screenshots in this chat if available.";
};

const createSupportTicket = async (req, res) => {
  try {
    if (req.user?.isAdmin) {
      return res.status(403).json({
        message: "Admin cannot create support tickets as users",
      });
    }

    const { subject, category, text, priority } = req.body;
    const file = req.file;
    const ticketUser = req.user;

    if (!ticketUser) {
      return res.status(401).json({
        message: "Please log in before opening a support ticket",
      });
    }

    if (!subject?.trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }

    if (!text?.trim() && !file) {
      return res.status(400).json({
        message: "Message text or file is required",
      });
    }

    const assignedAdmin = await getBestAvailableAdmin();

    const ticket = await SupportTicket.create({
      user: ticketUser._id,
      subject: subject.trim(),
      category: category || "other",
      priority: priority || "medium",
      status: assignedAdmin ? "in_progress" : "open",
      assignedAdmin: assignedAdmin?._id || null,
      assignedAt: assignedAdmin ? new Date() : null,
      lastMessageAt: new Date(),
    });

    let attachment = null;

if (file) {
  const uploaded = await uploadToCloudinary(file.buffer, "peerlearn/support");

  attachment = {
    url: uploaded.secure_url,
    fileName: file.originalname,
    fileType: detectFileType(file),
    mimeType: file.mimetype,
    size: file.size,
  };
}

    const firstMessage = await SupportMessage.create({
      ticket: ticket._id,
      sender: ticketUser._id,
      senderType: "user",
      text: text?.trim() || "",
      attachment,
      readBy: [ticketUser._id],
    });

    const autoReply = getAutoReply(text || subject, category || "other");

    const botMessage = await SupportMessage.create({
      ticket: ticket._id,
      sender: null,
      senderType: "bot",
      text: autoReply,
      readBy: [ticketUser._id],
    });

    const io = req.app.get("io");

    if (assignedAdmin) {
      await createAndEmitNotification({
        io,
        recipient: assignedAdmin._id.toString(),
        actor: ticketUser._id,
        type: "support_ticket_assigned",
        title: "New support ticket assigned",
        message: `${ticketUser.name} opened a support ticket.`,
        link: `/admin/support/${ticket._id}`,
        meta: { ticketId: ticket._id },
      });
    } else {
      const admins = await User.find({
        isAdmin: true,
        accountStatus: "active",
      }).select("_id");

      for (const admin of admins) {
        await createAndEmitNotification({
          io,
          recipient: admin._id.toString(),
          actor: ticketUser._id,
          type: "support_ticket_created",
          title: "New support ticket",
          message: `${ticketUser.name} opened a support ticket.`,
          link: `/admin/support/${ticket._id}`,
          meta: { ticketId: ticket._id },
        });
      }
    }

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate("user", "name email publicId")
      .populate("assignedAdmin", "name email publicId adminRole");

    res.status(201).json({
      message: "Support ticket created successfully",
      ticket: populatedTicket,
      firstMessage,
      botMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .populate("assignedAdmin", "name email publicId adminRole")
      .sort({ updatedAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupportMessages = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const isOwner = ticket.user.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await SupportMessage.updateMany(
      {
        ticket: ticket._id,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    const messages = await SupportMessage.find({ ticket: ticket._id })
      .populate("sender", "name email publicId avatar")
      .sort({ createdAt: 1 });

    const io = req.app.get("io");
    io.to(`support_ticket_${ticket._id}`).emit("support_messages_read", {
      ticketId: ticket._id.toString(),
      readerId: req.user._id.toString(),
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendSupportMessage = async (req, res) => {
  try {
    const { ticketId, text } = req.body;
    const file = req.file;

    if (!ticketId || (!text?.trim() && !file)) {
      return res.status(400).json({
        message: "ticketId and either text or file are required",
      });
    }

    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const isOwner = ticket.user.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let attachment = null;

if (file) {
  const uploaded = await uploadToCloudinary(file.buffer, "peerlearn/support");

  attachment = {
    url: uploaded.secure_url,
    fileName: file.originalname,
    fileType: detectFileType(file),
    mimeType: file.mimetype,
    size: file.size,
  };
}

    const supportMessage = await SupportMessage.create({
      ticket: ticketId,
      sender: req.user._id,
      senderType: isAdmin ? "admin" : "user",
      text: text?.trim() || "",
      attachment,
      readBy: [req.user._id],
    });

    ticket.lastMessageAt = new Date();

    if (ticket.status === "open" && isAdmin) {
      ticket.status = "in_progress";
      if (!ticket.assignedAdmin) {
        ticket.assignedAdmin = req.user._id;
        ticket.assignedAt = new Date();
      }
    }

    await ticket.save();

    const populatedMessage = await SupportMessage.findById(
      supportMessage._id
    ).populate("sender", "name email publicId avatar");

    const io = req.app.get("io");
    io.to(`support_ticket_${ticketId}`).emit(
      "new_support_message",
      populatedMessage
    );

    if (isAdmin) {
      await createAndEmitNotification({
        io,
        recipient: ticket.user.toString(),
        actor: req.user._id,
        type: "support_reply",
        title: "Support replied",
        message: `${req.user.name} replied to your support ticket.`,
        link: `/support/${ticketId}`,
        meta: { ticketId },
      });
    } else {
      if (ticket.assignedAdmin) {
        await createAndEmitNotification({
          io,
          recipient: ticket.assignedAdmin.toString(),
          actor: req.user._id,
          type: "support_user_reply",
          title: "Support ticket updated",
          message: `${req.user.name} replied to a support ticket.`,
          link: `/admin/support/${ticketId}`,
          meta: { ticketId },
        });
      } else {
        const admins = await User.find({
          isAdmin: true,
          accountStatus: "active",
        }).select("_id");

        for (const admin of admins) {
          await createAndEmitNotification({
            io,
            recipient: admin._id.toString(),
            actor: req.user._id,
            type: "support_user_reply",
            title: "Support ticket updated",
            message: `${req.user.name} replied to a support ticket.`,
            link: `/admin/support/${ticketId}`,
            meta: { ticketId },
          });
        }
      }
    }

    res.status(201).json({
      message: "Support message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySupportUnreadCount = async (req, res) => {
  try {
    const myTickets = await SupportTicket.find({ user: req.user._id }).select(
      "_id"
    );
    const ticketIds = myTickets.map((ticket) => ticket._id);

    if (ticketIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    const unreadCount = await SupportMessage.countDocuments({
      ticket: { $in: ticketIds },
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminSupportTickets = async (req, res) => {
  try {
    const query =
      req.user.adminRole === "super_admin"
        ? {}
        : { assignedAdmin: req.user._id };

    const tickets = await SupportTicket.find(query)
      .populate("user", "name email publicId avatar accountStatus")
      .populate("assignedAdmin", "name email publicId adminRole isSupportAvailable")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSupportTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid ticket status" });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const isAssignedAdmin =
      ticket.assignedAdmin &&
      ticket.assignedAdmin.toString() === req.user._id.toString();

    const isSuperAdmin = req.user.adminRole === "super_admin";

    if (!isAssignedAdmin && !isSuperAdmin) {
      return res.status(403).json({
        message: "Only assigned admin or super admin can update this ticket",
      });
    }

    ticket.status = status;

    if (status === "resolved" || status === "closed") {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "support_ticket_status_updated",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: `Ticket status changed to ${status}`,
      snapshot: ticket.toObject(),
    });

    res.json({
      message: "Ticket status updated successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reassignTicket = async (req, res) => {
  try {
    if (req.user.adminRole !== "super_admin") {
      return res.status(403).json({
        message: "Only super admin can reassign tickets",
      });
    }

    const { adminId } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

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

    await AuditLog.create({
      admin: req.user._id,
      action: "support_ticket_reassigned",
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
      message: "Ticket reassigned successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteResolvedTicket = async (req, res) => {
  try {
    if (req.user.adminRole !== "super_admin") {
      return res.status(403).json({
        message: "Only super admin can delete support tickets",
      });
    }

    const ticket = await SupportTicket.findById(req.params.id)
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

    await AuditLog.create({
      admin: req.user._id,
      action: "support_ticket_deleted",
      targetType: "SupportTicket",
      targetId: ticket._id,
      targetLabel: ticket.subject,
      details: "Resolved support ticket deleted by super admin",
      snapshot: ticket.toObject(),
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

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getSupportMessages,
  sendSupportMessage,
  getMySupportUnreadCount,
  getAdminSupportTickets,
  updateSupportTicketStatus,
  reassignTicket,
  deleteResolvedTicket,
};