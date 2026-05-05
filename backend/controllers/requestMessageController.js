const RequestMessage = require("../models/RequestMessage");
const LearnRequest = require("../models/LearnRequest");
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

const sendRequestMessage = async (req, res) => {
  try {
    const { requestId, text } = req.body;
    const file = req.file;

    if (!requestId || (!text?.trim() && !file)) {
      return res.status(400).json({
        message: "requestId and either text or file are required",
      });
    }

    const learnRequest = await LearnRequest.findById(requestId);

    if (!learnRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isTutor = learnRequest.tutor.toString() === req.user._id.toString();
    const isLearner = learnRequest.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let attachment = null;

    if (file) {
      const uploaded = await uploadToCloudinary(
        file.buffer,
        "peerlearn/request-messages"
      );

      attachment = {
        url: uploaded.secure_url,
        fileName: file.originalname,
        fileType: detectFileType(file),
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const newMessage = await RequestMessage.create({
      request: requestId,
      sender: req.user._id,
      text: text?.trim() || "",
      attachment,
      readBy: [req.user._id],
    });

    const populatedMessage = await RequestMessage.findById(newMessage._id).populate(
      "sender",
      "name email publicId avatar"
    );

    const io = req.app.get("io");
    io.to(`request_${requestId}`).emit("new_request_message", populatedMessage);

    const receiverId = isTutor ? learnRequest.learner : learnRequest.tutor;
    io.emit("unread-updated", { userId: receiverId.toString() });

    await createAndEmitNotification({
      io,
      recipient: receiverId.toString(),
      actor: req.user._id,
      type: "request_message",
      title: "New request chat message",
      message: `${req.user.name} sent you a new request message.`,
      link: `/request-chat/${requestId}`,
      meta: { requestId },
    });

    res.status(201).json({
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRequestMessages = async (req, res) => {
  try {
    const learnRequest = await LearnRequest.findById(req.params.requestId);

    if (!learnRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isTutor = learnRequest.tutor.toString() === req.user._id.toString();
    const isLearner = learnRequest.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await RequestMessage.updateMany(
      {
        request: req.params.requestId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    const messages = await RequestMessage.find({
      request: req.params.requestId,
    })
      .populate("sender", "name email publicId avatar")
      .sort({ createdAt: 1 });

    const io = req.app.get("io");
    io.to(`request_${req.params.requestId}`).emit("request_messages_read", {
      requestId: req.params.requestId,
      readerId: req.user._id.toString(),
    });

    io.emit("unread-updated", { userId: req.user._id.toString() });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRequestUnreadCount = async (req, res) => {
  try {
    const learnRequest = await LearnRequest.findById(req.params.requestId);

    if (!learnRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isTutor = learnRequest.tutor.toString() === req.user._id.toString();
    const isLearner = learnRequest.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const unreadCount = await RequestMessage.countDocuments({
      request: req.params.requestId,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyRequestUnreadCount = async (req, res) => {
  try {
    const myRequests = await LearnRequest.find({
      $or: [{ tutor: req.user._id }, { learner: req.user._id }],
    }).select("_id");

    const requestIds = myRequests.map((request) => request._id);

    if (requestIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    const unreadCount = await RequestMessage.countDocuments({
      request: { $in: requestIds },
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendRequestMessage,
  getRequestMessages,
  getRequestUnreadCount,
  getMyRequestUnreadCount,
};