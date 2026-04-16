import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function Notifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      setNotifications(res.data || []);
    } catch (error) {
      console.error("Failed to load notifications", error);
      showToast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    const handleNotificationUpdated = () => {
      fetchNotifications();
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("notification_updated", handleNotificationUpdated);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("notification_updated", handleNotificationUpdated);
    };
  }, [user?._id]);

  const getNotificationVisual = (type) => {
    const map = {
      session_message: {
        icon: "💬",
        label: "Session message",
        className: "is-session-message",
      },
      request_message: {
        icon: "📝",
        label: "Request message",
        className: "is-request-message",
      },
      learn_request: {
        icon: "📨",
        label: "Learning request",
        className: "is-learn-request",
      },
      request_accepted: {
        icon: "✅",
        label: "Request accepted",
        className: "is-request-accepted",
      },
      session_created: {
        icon: "📅",
        label: "Session created",
        className: "is-session-created",
      },
      exchange_request: {
        icon: "🤝",
        label: "Exchange request",
        className: "is-exchange-request",
      },
      exchange_request_accepted: {
        icon: "🎉",
        label: "Exchange accepted",
        className: "is-exchange-accepted",
      },
      exchange_message: {
        icon: "🔁",
        label: "Exchange message",
        className: "is-exchange-message",
      },
    };

    return map[type] || { icon: "🔔", label: "Notification", className: "is-default" };
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const date = new Date(value);

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isSameDay = (dateA, dateB) => {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  };

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const todayItems = [];
    const yesterdayItems = [];
    const earlierItems = [];

    notifications.forEach((notification) => {
      const createdAt = new Date(notification.createdAt);

      if (isSameDay(createdAt, now)) {
        todayItems.push(notification);
      } else if (isSameDay(createdAt, yesterday)) {
        yesterdayItems.push(notification);
      } else {
        earlierItems.push(notification);
      }
    });

    return [
      { title: "Today", items: todayItems },
      { title: "Yesterday", items: yesterdayItems },
      { title: "Earlier", items: earlierItems },
    ].filter((group) => group.items.length > 0);
  }, [notifications]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      showToast("All notifications marked as read", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to mark all as read", "error");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setClearingAll(true);
      await api.delete("/notifications");
      setNotifications([]);
      showToast("All notifications cleared", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to clear notifications", "error");
    } finally {
      setClearingAll(false);
    }
  };

  const handleDeleteOne = async (event, notificationId) => {
    event.stopPropagation();

    try {
      setDeletingNotificationId(notificationId);
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) =>
        prev.filter((item) => item._id !== notificationId)
      );
      showToast("Notification removed", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to remove notification", "error");
    } finally {
      setDeletingNotificationId("");
    }
  };

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="page notifications-page">
      <div className="notifications-page-header">
        <div>
          <div className="section-eyebrow">Activity Center</div>
          <h1 className="page-title">Notifications</h1>
          <p className="notifications-page-subtitle">
            Track new messages, requests, accepted actions, and session updates in one place.
          </p>
        </div>

        <div className="notifications-page-actions">
          <div className="notifications-summary-chip">
            {unreadCount} unread
          </div>

          <button
            type="button"
            className="secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAllRead}
          >
            {markingAllRead ? "Marking..." : "Mark all as read"}
          </button>

          <button
            type="button"
            className="danger"
            onClick={handleClearAll}
            disabled={notifications.length === 0 || clearingAll}
          >
            {clearingAll ? "Clearing..." : "Clear all"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state notifications-empty-state">
          No notifications yet
        </div>
      ) : (
        <div className="notifications-groups">
          {groupedNotifications.map((group) => (
            <section key={group.title} className="notifications-group">
              <div className="notifications-group-heading">{group.title}</div>

              <div className="notifications-list">
                {group.items.map((notification) => {
                  const visual = getNotificationVisual(notification.type);

                  return (
                    <div
                      key={notification._id}
                      className={`notification-card-wrap ${
                        !notification.isRead ? "is-unread" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`notification-card ${
                          !notification.isRead ? "is-unread" : ""
                        }`}
                        onClick={() => handleOpenNotification(notification)}
                      >
                        <div className={`notification-card-icon ${visual.className}`}>
                          {visual.icon}
                        </div>

                        <div className="notification-card-content">
                          <div className="notification-card-top">
                            <div className="notification-card-title-wrap">
                              <h3 className="notification-card-title">
                                {notification.title}
                              </h3>
                              <span className="notification-card-type">
                                {visual.label}
                              </span>
                            </div>

                            <span className="notification-card-time">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </div>

                          <p className="notification-card-message">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.isRead && (
                          <span className="notification-card-dot" />
                        )}
                      </button>

                      <button
                        type="button"
                        className="notification-card-remove"
                        onClick={(event) => handleDeleteOne(event, notification._id)}
                        disabled={deletingNotificationId === notification._id}
                        aria-label="Remove notification"
                        title="Remove notification"
                      >
                        {deletingNotificationId === notification._id ? "..." : "✕"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;