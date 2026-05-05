const Message = require("../models/Message");
const Session = require("../models/Session");
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

const sendMessage = async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    const file = req.file;

    if (!sessionId || (!text?.trim() && !file)) {
      return res.status(400).json({
        message: "sessionId and either text or file are required",
      });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isTutor = session.tutor.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let attachment = null;

    if (file) {
      const uploaded = await uploadToCloudinary(file.buffer, "peerlearn/session-messages");

      attachment = {
        url: uploaded.secure_url,
        fileName: file.originalname,
        fileType: detectFileType(file),
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const message = await Message.create({
      session: sessionId,
      sender: req.user._id,
      text: text?.trim() || "",
      attachment,
      readBy: [req.user._id],
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email publicId avatar"
    );

    const io = req.app.get("io");
    io.to(`session_${sessionId}`).emit("new_session_message", populatedMessage);

    const receiverId = isTutor ? session.learner : session.tutor;
    io.emit("unread-updated", { userId: receiverId.toString() });

    await createAndEmitNotification({
      io,
      recipient: receiverId.toString(),
      actor: req.user._id,
      type: "session_message",
      title: "New session message",
      message: `${req.user.name} sent you a new session message.`,
      link: `/chat/${sessionId}`,
      meta: { sessionId },
    });

    res.status(201).json({
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSessionMessages = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isTutor = session.tutor.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Message.updateMany(
      {
        session: req.params.sessionId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    const messages = await Message.find({ session: req.params.sessionId })
      .populate("sender", "name email publicId avatar")
      .sort({ createdAt: 1 });

    const io = req.app.get("io");
    io.to(`session_${req.params.sessionId}`).emit("session_messages_read", {
      sessionId: req.params.sessionId,
      readerId: req.user._id.toString(),
    });

    io.emit("unread-updated", { userId: req.user._id.toString() });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const mySessions = await Session.find({
      $or: [{ tutor: req.user._id }, { learner: req.user._id }],
    }).select("_id");

    const sessionIds = mySessions.map((session) => session._id);

    if (sessionIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    const unreadCount = await Message.countDocuments({
      session: { $in: sessionIds },
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSessionUnreadCount = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isTutor = session.tutor.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const unreadCount = await Message.countDocuments({
      session: req.params.sessionId,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getSessionMessages,
  getUnreadCount,
  getSessionUnreadCount,
};