const Message = require("../models/Message");
const RequestMessage = require("../models/RequestMessage");
const Session = require("../models/Session");
const LearnRequest = require("../models/LearnRequest");

const getAllChats = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const myRequests = await LearnRequest.find({
      $or: [{ tutor: userId }, { learner: userId }],
    })
      .populate("tutor", "name email publicId")
      .populate("learner", "name email publicId")
      .populate("listing", "skillName");

    const mySessions = await Session.find({
      $or: [{ tutor: userId }, { learner: userId }],
    })
      .populate("tutor", "name email publicId")
      .populate("learner", "name email publicId")
      .populate({
        path: "request",
        populate: {
          path: "listing",
          select: "skillName",
        },
      });

    const requestChats = await Promise.all(
      myRequests.map(async (reqItem) => {
        const lastMessage = await RequestMessage.findOne({ request: reqItem._id })
          .populate("sender", "name email publicId")
          .sort({ createdAt: -1 });

        const unreadCount = await RequestMessage.countDocuments({
          request: reqItem._id,
          sender: { $ne: userId },
          readBy: { $ne: userId },
        });

        const otherUser =
          reqItem.tutor._id.toString() === userId ? reqItem.learner : reqItem.tutor;

        return {
          type: "request",
          chatId: reqItem._id,
          otherUser,
          skillName: reqItem.listing?.skillName || "N/A",
          lastMessage,
          unreadCount,
        };
      })
    );

    const sessionChats = await Promise.all(
      mySessions.map(async (sessionItem) => {
        const lastMessage = await Message.findOne({ session: sessionItem._id })
          .populate("sender", "name email publicId")
          .sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          session: sessionItem._id,
          sender: { $ne: userId },
          readBy: { $ne: userId },
        });

        const otherUser =
          sessionItem.tutor._id.toString() === userId
            ? sessionItem.learner
            : sessionItem.tutor;

        return {
          type: "session",
          chatId: sessionItem._id,
          otherUser,
          skillName: sessionItem.request?.listing?.skillName || "N/A",
          lastMessage,
          unreadCount,
        };
      })
    );

    const allChats = [...requestChats, ...sessionChats].sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : 0;
      return bTime - aTime;
    });

    const totalUnread = allChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

    res.json({
      totalUnread,
      chats: allChats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllChats,
};