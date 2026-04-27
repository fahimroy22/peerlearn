import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import api, { API_BASE_URL } from "../api/axios";
import socket from "../socket";
import useAuth from "../context/useAuth";

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [bellPulse, setBellPulse] = useState(false);
  const [clearingAllNotifications, setClearingAllNotifications] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState("");

  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const pulseTimeoutRef = useRef(null);

  const isAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    let intervalId;

    const fetchUnreadCount = async () => {
      if (!user || isAdmin) {
        setUnreadCount(0);
        return;
      }

      try {
        const [sessionUnreadRes, requestUnreadRes, exchangeUnreadRes] =
          await Promise.all([
            api.get("/messages/unread-count"),
            api.get("/request-messages/unread-count"),
            api.get("/exchange-messages/unread-count"),
          ]);

        const totalUnread =
          (sessionUnreadRes.data?.unreadCount || 0) +
          (requestUnreadRes.data?.unreadCount || 0) +
          (exchangeUnreadRes.data?.unreadCount || 0);

        setUnreadCount(totalUnread);
      } catch {
        setUnreadCount(0);
      }
    };

    if (user && !isAdmin) {
      fetchUnreadCount();
      intervalId = setInterval(fetchUnreadCount, 10000);
      socket.on("unread-updated", fetchUnreadCount);
    } else {
      setUnreadCount(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      socket.off("unread-updated", fetchUnreadCount);
    };
  }, [user, location.pathname, isAdmin]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfileData(null);
        return;
      }

      try {
        const res = await api.get("/users/profile");
        setProfileData(res.data || null);
      } catch {
        setProfileData(user);
      }
    };

    fetchProfile();
  }, [user, location.pathname]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setNotificationUnreadCount(0);
        return;
      }

      try {
        const [listRes, countRes] = await Promise.all([
          api.get("/notifications"),
          api.get("/notifications/unread-count"),
        ]);

        setNotifications(listRes.data || []);
        setNotificationUnreadCount(countRes.data?.unreadCount || 0);
      } catch {
        setNotifications([]);
        setNotificationUnreadCount(0);
      }
    };

    fetchNotifications();

    const triggerPulse = () => {
      setBellPulse(true);

      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }

      pulseTimeoutRef.current = setTimeout(() => {
        setBellPulse(false);
      }, 2200);
    };

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 25));
      setNotificationUnreadCount((prev) => prev + 1);
      triggerPulse();
    };

    const handleNotificationUpdated = ({ unreadCount: updatedUnreadCount }) => {
      setNotificationUnreadCount(updatedUnreadCount || 0);
      fetchNotifications();
    };

    if (user) {
      socket.on("new_notification", handleNewNotification);
      socket.on("notification_updated", handleNotificationUpdated);
    }

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("notification_updated", handleNotificationUpdated);

      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNotificationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 980) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }

      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setUnreadCount(0);
    setNotificationUnreadCount(0);
    setProfileOpen(false);
    setNotificationOpen(false);
    logout();
  };

  const handleOpenNotifications = async () => {
    const next = !notificationOpen;
    setNotificationOpen(next);
    setProfileOpen(false);

    if (next && notificationUnreadCount > 0) {
      try {
        await api.patch("/notifications/read-all");
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        setNotificationUnreadCount(0);
      } catch (error) {
        console.error("Failed to mark notifications as read", error);
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item
          )
        );
        setNotificationUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }

    setNotificationOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDeleteNotification = async (event, notificationId) => {
    event.stopPropagation();

    try {
      setDeletingNotificationId(notificationId);

      const targetNotification = notifications.find(
        (item) => item._id === notificationId
      );

      await api.delete(`/notifications/${notificationId}`);

      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));

      if (targetNotification && !targetNotification.isRead) {
        setNotificationUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification", error);
    } finally {
      setDeletingNotificationId("");
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      setClearingAllNotifications(true);
      await api.delete("/notifications");
      setNotifications([]);
      setNotificationUnreadCount(0);
    } catch (error) {
      console.error("Failed to clear notifications", error);
    } finally {
      setClearingAllNotifications(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  const currentProfile = profileData || user;
  const userInitial = currentProfile?.name?.charAt(0)?.toUpperCase() || "U";

  const avatarSrc = useMemo(() => {
    const avatar =
      currentProfile?.avatar ||
      currentProfile?.profileImage ||
      currentProfile?.image ||
      "";

    if (!avatar) return "";
    if (avatar.startsWith("http")) return avatar;
    return `${API_BASE_URL}${avatar}`;
  }, [currentProfile]);

  const renderNotificationTypeIcon = (type) => {
    const iconClass = `navbar-notification-svg ${getNotificationVisual(type).className}`;

    switch (type) {
      case "support_ticket_created":
      case "support_reply":
      case "support_user_reply":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );

      case "session_message":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );

      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
        );
    }
  };

  const getNotificationVisual = (type) => {
    const map = {
      session_message: { className: "is-session-message" },
      request_message: { className: "is-request-message" },
      learn_request: { className: "is-learn-request" },
      request_accepted: { className: "is-request-accepted" },
      session_created: { className: "is-session-created" },
      exchange_request: { className: "is-exchange-request" },
      exchange_request_accepted: { className: "is-exchange-accepted" },
      exchange_message: { className: "is-exchange-message" },
      support_ticket_created: { className: "is-request-message" },
      support_reply: { className: "is-session-message" },
      support_user_reply: { className: "is-learn-request" },
    };

    return map[type] || { className: "is-default" };
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
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

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="PeerLearn Home">
          <span className="navbar-brand-main">
            <span className="navbar-brand-peer">Peer</span>
            <span className="navbar-brand-learn">Learn</span>
          </span>
          <span className="navbar-brand-subtitle">Skill Exchange Platform</span>
        </Link>

        <button
          type="button"
          className={`navbar-toggle ${mobileOpen ? "is-open" : ""}`}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen((prev) => {
              const next = !prev;
              if (next) {
                setProfileOpen(false);
                setNotificationOpen(false);
              }
              return next;
            });
          }}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar-links ${mobileOpen ? "is-open" : ""}`}>
          <div className="navbar-links-left">
            <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
              Home
            </Link>

            {!isAdmin && (
              <>
                <Link
                  to="/listings"
                  className={`nav-link ${isActive("/listings") ? "active" : ""}`}
                >
                  Tutor Listings
                </Link>

                {user && (
                  <>
                    <Link
                      to="/learn-listings"
                      className={`nav-link ${isActive("/learn-listings") ? "active" : ""}`}
                    >
                      Learn Listings
                    </Link>

                    <Link
                      to="/skill-exchange"
                      className={`nav-link ${isActive("/skill-exchange") ? "active" : ""}`}
                    >
                      Skill Exchange
                    </Link>

                    <Link
                      to="/requests"
                      className={`nav-link ${isActive("/requests") ? "active" : ""}`}
                    >
                      Requests
                    </Link>

                    <Link
                      to="/sessions"
                      className={`nav-link ${isActive("/sessions") ? "active" : ""}`}
                    >
                      Sessions
                    </Link>

                    <Link
                      to="/chats"
                      className={`nav-link ${isActive("/chats") ? "active" : ""}`}
                    >
                      <span className="nav-chip">
                        Chats
                        {unreadCount > 0 && (
                          <span className="badge badge-blue">{unreadCount}</span>
                        )}
                      </span>
                    </Link>

                    <Link
                      to="/help"
                      className={`nav-link ${isActive("/help") ? "active" : ""}`}
                    >
                      Help
                    </Link>
                  </>
                )}
              </>
            )}

            {isAdmin && (
  <>
    <Link
      to="/admin"
      className={`nav-link ${isActive("/admin") ? "active" : ""}`}
    >
      Admin Dashboard
    </Link>

    <Link
      to="/admin/profile"
      className={`nav-link ${isActive("/admin/profile") ? "active" : ""}`}
    >
      Profile
    </Link>

    <Link
      to="/admin/users"
      className={`nav-link ${isActive("/admin/users") ? "active" : ""}`}
    >
      Users
    </Link>

    <Link
      to="/admin/listings"
      className={`nav-link ${isActive("/admin/listings") ? "active" : ""}`}
    >
      Listings
    </Link>

    <Link
      to="/admin/support"
      className={`nav-link ${isActive("/admin/support") ? "active" : ""}`}
    >
      Support Tickets
    </Link>

    <Link
      to="/admin/audit"
      className={`nav-link ${isActive("/admin/audit") ? "active" : ""}`}
    >
      Audit Logs
    </Link>
  </>
)}
          </div>

          <div className="navbar-links-right">
            {user ? (
              <>
                <div
                  className={`navbar-notification ${notificationOpen ? "is-open" : ""}`}
                  ref={notificationMenuRef}
                >
                  <button
                    type="button"
                    className={`navbar-notification-trigger ${
                      notificationOpen ? "is-open" : ""
                    } ${bellPulse ? "has-pulse" : ""} ${
                      notificationUnreadCount > 0 ? "has-unread" : ""
                    }`}
                    onClick={() => {
                      setProfileOpen(false);
                      handleOpenNotifications();
                    }}
                    aria-label="Open notifications"
                    aria-expanded={notificationOpen}
                  >
                    <span className="navbar-bell" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="navbar-bell-icon"
                      >
                        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                        <path d="M10 20a2 2 0 0 0 4 0" />
                      </svg>
                    </span>

                    {notificationUnreadCount > 0 && (
                      <span className="navbar-notification-badge">
                        {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                      </span>
                    )}
                  </button>

                  <div className="navbar-notification-menu">
                    <div className="navbar-notification-head">
                      <div>
                        <div className="navbar-notification-title">Notifications</div>
                        <div className="navbar-notification-subtitle">
                          Latest activity across chats, requests, sessions, and support
                        </div>
                      </div>

                      <div className="navbar-notification-head-actions">
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            className="navbar-notification-clear-all"
                            onClick={handleClearAllNotifications}
                            disabled={clearingAllNotifications}
                          >
                            {clearingAllNotifications ? "Clearing..." : "Clear all"}
                          </button>
                        )}

                        <Link
                          to="/notifications"
                          className="navbar-notification-view-all"
                          onClick={() => setNotificationOpen(false)}
                        >
                          View all
                        </Link>
                      </div>
                    </div>

                    <div className="navbar-notification-list">
                      {notifications.length === 0 ? (
                        <div className="navbar-notification-empty">
                          No notifications yet
                        </div>
                      ) : (
                        groupedNotifications.map((group) => (
                          <div key={group.title} className="navbar-notification-group">
                            <div className="navbar-notification-group-title">
                              {group.title}
                            </div>

                            {group.items.slice(0, 4).map((notification) => {
                              const visual = getNotificationVisual(notification.type);

                              return (
                                <div
                                  key={notification._id}
                                  className={`navbar-notification-item-wrap ${
                                    !notification.isRead ? "is-unread" : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className={`navbar-notification-item ${
                                      !notification.isRead ? "is-unread" : ""
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                  >
                                    <div
                                      className={`navbar-notification-icon ${visual.className}`}
                                    >
                                      {renderNotificationTypeIcon(notification.type)}
                                    </div>

                                    <div className="navbar-notification-content">
                                      <div className="navbar-notification-item-top">
                                        <span className="navbar-notification-item-title">
                                          {notification.title}
                                        </span>
                                        <span className="navbar-notification-time">
                                          {formatNotificationTime(notification.createdAt)}
                                        </span>
                                      </div>

                                      <div className="navbar-notification-message">
                                        {notification.message}
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    className="navbar-notification-remove"
                                    onClick={(event) =>
                                      handleDeleteNotification(event, notification._id)
                                    }
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
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`navbar-profile ${profileOpen ? "is-open" : ""}`}
                  ref={profileMenuRef}
                >
                  <button
                    type="button"
                    className={`navbar-profile-trigger ${profileOpen ? "is-open" : ""}`}
                    onClick={() => {
                      setNotificationOpen(false);
                      setProfileOpen((prev) => !prev);
                    }}
                    aria-label="Open profile menu"
                    aria-expanded={profileOpen}
                  >
                    <span className="navbar-profile-ring">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={currentProfile?.name || "User"}
                          className="navbar-avatar-image"
                        />
                      ) : (
                        <span className="navbar-avatar">{userInitial}</span>
                      )}
                    </span>

                    <span className="navbar-profile-copy">
                      <span className="navbar-profile-name">
                        {currentProfile?.name || "User"}
                      </span>
                      <span className="navbar-profile-id">
                        {currentProfile?.publicId || "Student"}
                      </span>
                    </span>

                    <span className="navbar-profile-caret">⌄</span>
                  </button>

                  <div className="navbar-profile-menu">
                    <div className="navbar-profile-menu-arrow" />

                    <div className="navbar-profile-menu-head">
                      <div className="navbar-profile-menu-user">
                        <span className="navbar-profile-menu-ring">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={currentProfile?.name || "User"}
                              className="navbar-profile-menu-avatar-image"
                            />
                          ) : (
                            <span className="navbar-profile-menu-avatar">
                              {userInitial}
                            </span>
                          )}
                        </span>

                        <div>
                          <div className="navbar-profile-menu-name">
                            {currentProfile?.name || "User"}
                          </div>
                          <div className="navbar-profile-menu-email">
                            {currentProfile?.email || ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={isAdmin ? "/admin" : "/dashboard"}
                      className="navbar-menu-item"
                    >
                      {isAdmin ? "Admin Dashboard" : "Dashboard"}
                    </Link>

                    {!isAdmin && (
                      <>
                        <Link to="/edit-profile" className="navbar-menu-item">
                          Edit Profile
                        </Link>

                        <Link to="/support/my" className="navbar-menu-item">
                          My Support Tickets
                        </Link>
                      </>
                    )}

                    {isAdmin && (
  <>
    <Link to="/admin/profile" className="navbar-menu-item">
      Admin Profile
    </Link>

    <Link to="/admin/users" className="navbar-menu-item">
      Manage Users
    </Link>

    <Link to="/admin/listings" className="navbar-menu-item">
      Listings
    </Link>

    <Link to="/admin/support" className="navbar-menu-item">
      Support Tickets
    </Link>

    <Link to="/admin/audit" className="navbar-menu-item">
      Audit Logs
    </Link>
  </>
)}

                    <button
                      type="button"
                      className="navbar-menu-item navbar-menu-item-danger"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`nav-link ${isActive("/login") ? "active" : ""}`}
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className={`nav-link nav-link-register ${
                    isActive("/register") ? "active" : ""
                  }`}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;