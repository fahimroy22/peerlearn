const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notificationController");

router.get("/", authMiddleware, getMyNotifications);
router.get("/unread-count", authMiddleware, getUnreadNotificationCount);
router.patch("/read-all", authMiddleware, markAllNotificationsAsRead);
router.patch("/:id/read", authMiddleware, markNotificationAsRead);
router.delete("/:id", authMiddleware, deleteNotification);
router.delete("/", authMiddleware, clearAllNotifications);

module.exports = router;