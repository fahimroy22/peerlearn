const Notification = require("../models/Notification");

const emitNotificationUpdate = async (io, userId) => {
  if (!io || !userId) return;

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  io.to(`user_${userId}`).emit("notification_updated", {
    unreadCount,
  });
};

const createAndEmitNotification = async ({
  io,
  recipient,
  actor = null,
  type,
  title,
  message,
  link = "",
  meta = {},
}) => {
  if (!recipient || !type || !title || !message) return null;

  const notification = await Notification.create({
    recipient,
    actor,
    type,
    title,
    message,
    link,
    meta,
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate("actor", "name email publicId avatar");

  io.to(`user_${recipient}`).emit("new_notification", populatedNotification);
  await emitNotificationUpdate(io, recipient);

  return populatedNotification;
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("actor", "name email publicId avatar")
      .sort({ createdAt: -1 })
      .limit(25);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    const io = req.app.get("io");
    await emitNotificationUpdate(io, req.user._id.toString());

    res.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    const io = req.app.get("io");
    await emitNotificationUpdate(io, req.user._id.toString());

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await Notification.deleteOne({ _id: notification._id });

    const io = req.app.get("io");
    await emitNotificationUpdate(io, req.user._id.toString());

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user._id,
    });

    const io = req.app.get("io");
    await emitNotificationUpdate(io, req.user._id.toString());

    res.json({ message: "All notifications cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAndEmitNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
};