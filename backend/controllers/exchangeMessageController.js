const ExchangeConversation = require("../models/ExchangeConversation");
const ExchangeMessage = require("../models/ExchangeMessage");
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

const sendExchangeMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const file = req.file;

    if (!conversationId || (!text?.trim() && !file)) {
      return res.status(400).json({
        message: "conversationId and either text or file are required",
      });
    }

    const conversation = await ExchangeConversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Exchange conversation not found" });
    }

    const isParticipant =
      String(conversation.userOne) === String(req.user._id) ||
      String(conversation.userTwo) === String(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let attachment = null;

    if (file) {
      const uploaded = await uploadToCloudinary(
        file.buffer,
        "peerlearn/exchange-messages"
      );

      attachment = {
        url: uploaded.secure_url,
        fileName: file.originalname,
        fileType: detectFileType(file),
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const message = await ExchangeMessage.create({
      conversation: conversationId,
      sender: req.user._id,
      text: text?.trim() || "",
      attachment,
      readBy: [req.user._id],
    });

    const populatedMessage = await ExchangeMessage.findById(message._id).populate(
      "sender",
      "name email publicId avatar"
    );

    const io = req.app.get("io");
    io.to(`exchange_${conversationId}`).emit("new_exchange_message", populatedMessage);
    io.emit("unread-updated", { type: "exchange" });

    const receiverId =
      String(conversation.userOne) === String(req.user._id)
        ? conversation.userTwo
        : conversation.userOne;

    await createAndEmitNotification({
      io,
      recipient: receiverId.toString(),
      actor: req.user._id,
      type: "exchange_message",
      title: "New exchange message",
      message: `${req.user.name} sent you a new exchange message.`,
      link: `/exchange-chat/${conversationId}`,
      meta: { conversationId },
    });

    res.status(201).json({
      message: "Exchange message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExchangeMessages = async (req, res) => {
  try {
    const conversation = await ExchangeConversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Exchange conversation not found" });
    }

    const isParticipant =
      String(conversation.userOne) === String(req.user._id) ||
      String(conversation.userTwo) === String(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await ExchangeMessage.updateMany(
      {
        conversation: req.params.conversationId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    const messages = await ExchangeMessage.find({
      conversation: req.params.conversationId,
    })
      .populate("sender", "name email publicId avatar")
      .sort({ createdAt: 1 });

    const io = req.app.get("io");
    io.to(`exchange_${req.params.conversationId}`).emit("exchange_messages_read", {
      conversationId: req.params.conversationId,
      readerId: req.user._id.toString(),
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExchangeUnreadCount = async (req, res) => {
  try {
    const conversations = await ExchangeConversation.find({
      $or: [{ userOne: req.user._id }, { userTwo: req.user._id }],
    }).select("_id");

    const conversationIds = conversations.map((item) => item._id);

    if (conversationIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    const unreadCount = await ExchangeMessage.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendExchangeMessage,
  getExchangeMessages,
  getExchangeUnreadCount,
};