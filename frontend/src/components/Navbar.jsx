import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const pulseTimeoutRef = useRef(null);
  const navRef = useRef(null);

  const isAdmin = Boolean(user?.isAdmin);

  /* ── scroll shrink ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── unread chat count ── */
  useEffect(() => {
    let intervalId;
    const fetchUnread = async () => {
      if (!user || isAdmin) { setUnreadCount(0); return; }
      try {
        const [a, b, c] = await Promise.all([
          api.get("/messages/unread-count"),
          api.get("/request-messages/unread-count"),
          api.get("/exchange-messages/unread-count"),
        ]);
        setUnreadCount(
          (a.data?.unreadCount || 0) + (b.data?.unreadCount || 0) + (c.data?.unreadCount || 0)
        );
      } catch { setUnreadCount(0); }
    };
    if (user && !isAdmin) {
      fetchUnread();
      intervalId = setInterval(fetchUnread, 10000);
      socket.on("unread-updated", fetchUnread);
    } else { setUnreadCount(0); }
    return () => { if (intervalId) clearInterval(intervalId); socket.off("unread-updated", fetchUnread); };
  }, [user, location.pathname, isAdmin]);

  /* ── profile data ── */
  useEffect(() => {
    if (!user) { setProfileData(null); return; }
    api.get("/users/profile").then((r) => setProfileData(r.data || null)).catch(() => setProfileData(user));
  }, [user, location.pathname]);

  /* ── notifications ── */
  useEffect(() => {
    const fetch = async () => {
      if (!user) { setNotifications([]); setNotificationUnreadCount(0); return; }
      try {
        const [list, count] = await Promise.all([api.get("/notifications"), api.get("/notifications/unread-count")]);
        setNotifications(list.data || []);
        setNotificationUnreadCount(count.data?.unreadCount || 0);
      } catch { setNotifications([]); setNotificationUnreadCount(0); }
    };
    fetch();

    const triggerPulse = () => {
      setBellPulse(true);
      clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setBellPulse(false), 2200);
    };

    const handleNew = (n) => {
      setNotifications((p) => [n, ...p].slice(0, 25));
      setNotificationUnreadCount((p) => p + 1);
      triggerPulse();
    };
    const handleUpdated = ({ unreadCount: u }) => {
      setNotificationUnreadCount(u || 0);
      fetch();
    };
    if (user) {
      socket.on("new_notification", handleNew);
      socket.on("notification_updated", handleUpdated);
    }
    return () => {
      socket.off("new_notification", handleNew);
      socket.off("notification_updated", handleUpdated);
      clearTimeout(pulseTimeoutRef.current);
    };
  }, [user]);

  /* ── close on route change ── */
  useEffect(() => {
    setMobileOpen(false); setProfileOpen(false); setNotificationOpen(false);
  }, [location.pathname]);

  /* ── resize close mobile ── */
  useEffect(() => {
    const h = () => { if (window.innerWidth > 980) setMobileOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* ── outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileOpen(false);
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target)) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    setUnreadCount(0); setNotificationUnreadCount(0);
    setProfileOpen(false); setNotificationOpen(false);
    logout();
  };

  const handleOpenNotifications = async () => {
    const next = !notificationOpen;
    setNotificationOpen(next);
    setProfileOpen(false);
    if (next && notificationUnreadCount > 0) {
      try {
        await api.patch("/notifications/read-all");
        setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
        setNotificationUnreadCount(0);
      } catch {}
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n._id}/read`);
        setNotifications((p) => p.map((x) => x._id === n._id ? { ...x, isRead: true } : x));
        setNotificationUnreadCount((p) => Math.max(0, p - 1));
      }
    } catch {}
    setNotificationOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const target = notifications.find((n) => n._id === id);
      await api.delete(`/notifications/${id}`);
      setNotifications((p) => p.filter((n) => n._id !== id));
      if (target && !target.isRead) setNotificationUnreadCount((p) => Math.max(0, p - 1));
    } catch {}
    setDeletingId("");
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      await api.delete("/notifications");
      setNotifications([]); setNotificationUnreadCount(0);
    } catch {}
    setClearingAll(false);
  };

  const isActive = (path) => location.pathname === path;

  const currentProfile = profileData || user;
  const userInitial = currentProfile?.name?.charAt(0)?.toUpperCase() || "U";
  const avatarSrc = useMemo(() => {
    const a = currentProfile?.avatar || currentProfile?.profileImage || currentProfile?.image || "";
    if (!a) return "";
    return a.startsWith("http") ? a : `${API_BASE_URL}${a}`;
  }, [currentProfile]);

  const notifIconClass = useCallback((type) => {
    const map = {
      session_message: "nv-icon-indigo", request_message: "nv-icon-blue",
      learn_request: "nv-icon-orange", request_accepted: "nv-icon-green",
      session_created: "nv-icon-purple", exchange_request: "nv-icon-pink",
      exchange_request_accepted: "nv-icon-yellow", exchange_message: "nv-icon-cyan",
      support_ticket_created: "nv-icon-blue", support_reply: "nv-icon-indigo",
      support_user_reply: "nv-icon-orange",
    };
    return map[type] || "nv-icon-gray";
  }, []);

  const notifSVG = (type) => {
    const isChat = ["session_message", "request_message", "support_ticket_created", "support_reply", "support_user_reply"].includes(type);
    if (isChat) return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    );
  };

  const fmtTime = (v) => {
    if (!v) return "";
    const d = new Date(v), now = new Date();
    const m = Math.floor((now - d) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const groupedNotifs = useMemo(() => {
    const now = new Date(), yest = new Date();
    yest.setDate(now.getDate() - 1);
    const t = [], y = [], e = [];
    notifications.forEach((n) => {
      const d = new Date(n.createdAt);
      if (sameDay(d, now)) t.push(n);
      else if (sameDay(d, yest)) y.push(n);
      else e.push(n);
    });
    return [{ title: "Today", items: t }, { title: "Yesterday", items: y }, { title: "Earlier", items: e }]
      .filter((g) => g.items.length > 0);
  }, [notifications]);

  /* nav links config */
  const publicLinks = [{ to: "/listings", label: "Tutor Listings" }];
  const authLinks = [
    { to: "/learn-listings", label: "Learn Listings" },
    { to: "/skill-exchange",  label: "Skill Exchange" },
    { to: "/requests",        label: "Requests" },
    { to: "/sessions",        label: "Sessions" },
    { to: "/chats",           label: "Chats", badge: unreadCount },
    { to: "/help",            label: "Help" },
  ];
  const adminLinks = [
    { to: "/admin",          label: "Dashboard" },
    { to: "/admin/profile",  label: "Profile" },
    { to: "/admin/users",    label: "Users" },
    { to: "/admin/listings", label: "Listings" },
    { to: "/admin/support",  label: "Support" },
    { to: "/admin/audit",    label: "Audit Logs" },
  ];

  const navLinks = isAdmin
    ? adminLinks
    : [{ to: "/", label: "Home" }, ...publicLinks, ...(user ? authLinks : [])];

  return (
    <nav ref={navRef} className={`nv-bar ${scrolled ? "nv-scrolled" : ""}`}>
      {/* progress shimmer line */}
      <div className="nv-shimmer" />

      <div className="nv-inner">

        {/* ── Brand ── */}
        <Link to="/" className="nv-brand" aria-label="PeerLearn Home">
          <span className="nv-brand-logo">
            <span className="nv-brand-peer">Peer</span>
            <span className="nv-brand-learn">Learn</span>
          </span>
          <span className="nv-brand-sub">Skill Exchange Platform</span>
        </Link>

        {/* ── Mobile toggle ── */}
        <button
          type="button"
          className={`nv-toggle ${mobileOpen ? "is-open" : ""}`}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen((p) => { const next = !p; if (next) { setProfileOpen(false); setNotificationOpen(false); } return next; });
          }}
        >
          <span /><span /><span />
        </button>

        {/* ── Links ── */}
        <div className={`nv-links ${mobileOpen ? "is-open" : ""}`}>

          {/* left: nav links */}
          <div className="nv-links-left">
            {navLinks.map(({ to, label, badge }) => (
              <Link key={to} to={to} className={`nv-link ${isActive(to) ? "is-active" : ""}`}>
                {label}
                {badge > 0 && <span className="nv-badge">{badge > 99 ? "99+" : badge}</span>}
              </Link>
            ))}
          </div>

          {/* right: auth controls */}
          <div className="nv-links-right">
            {user ? (
              <>
                {/* ── Bell ── */}
                <div
                  className={`nv-notif ${notificationOpen ? "is-open" : ""}`}
                  ref={notificationMenuRef}
                >
                  <button
                    type="button"
                    className={`nv-bell-btn ${bellPulse ? "has-pulse" : ""} ${notificationUnreadCount > 0 ? "has-unread" : ""} ${notificationOpen ? "is-open" : ""}`}
                    onClick={() => { setProfileOpen(false); handleOpenNotifications(); }}
                    aria-label="Notifications"
                  >
                    <svg className="nv-bell-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                      <path d="M10 20a2 2 0 0 0 4 0" />
                    </svg>
                    {notificationUnreadCount > 0 && (
                      <span className="nv-bell-badge">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span>
                    )}
                  </button>

                  {/* notification dropdown */}
                  <div className="nv-notif-panel">
                    <div className="nv-notif-head">
                      <div>
                        <div className="nv-notif-title">Notifications</div>
                        <div className="nv-notif-subtitle">Activity across chats, requests and sessions</div>
                      </div>
                      <div className="nv-notif-head-right">
                        {notifications.length > 0 && (
                          <button type="button" className="nv-clear-btn" onClick={handleClearAll} disabled={clearingAll}>
                            {clearingAll ? "Clearing…" : "Clear all"}
                          </button>
                        )}
                        <Link to="/notifications" className="nv-view-all" onClick={() => setNotificationOpen(false)}>
                          View all →
                        </Link>
                      </div>
                    </div>

                    <div className="nv-notif-list">
                      {notifications.length === 0 ? (
                        <div className="nv-notif-empty">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="nv-empty-icon">
                            <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                            <path d="M10 20a2 2 0 0 0 4 0" />
                          </svg>
                          <span>No notifications yet</span>
                        </div>
                      ) : (
                        groupedNotifs.map((group) => (
                          <div key={group.title} className="nv-notif-group">
                            <div className="nv-notif-group-label">{group.title}</div>
                            {group.items.slice(0, 4).map((n) => (
                              <div key={n._id} className={`nv-notif-row ${!n.isRead ? "is-unread" : ""}`}>
                                <button
                                  type="button"
                                  className="nv-notif-item"
                                  onClick={() => handleNotificationClick(n)}
                                >
                                  <div className={`nv-notif-icon ${notifIconClass(n.type)}`}>
                                    {notifSVG(n.type)}
                                  </div>
                                  <div className="nv-notif-body">
                                    <div className="nv-notif-top">
                                      <span className="nv-notif-name">{n.title}</span>
                                      <span className="nv-notif-time">{fmtTime(n.createdAt)}</span>
                                    </div>
                                    <div className="nv-notif-msg">{n.message}</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  className="nv-notif-del"
                                  onClick={(e) => handleDeleteNotification(e, n._id)}
                                  disabled={deletingId === n._id}
                                  aria-label="Remove"
                                >
                                  {deletingId === n._id ? "…" : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                      <path d="M18 6 6 18M6 6l12 12" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Profile ── */}
                <div
                  className={`nv-profile ${profileOpen ? "is-open" : ""}`}
                  ref={profileMenuRef}
                >
                  <button
                    type="button"
                    className={`nv-profile-btn ${profileOpen ? "is-open" : ""}`}
                    onClick={() => { setNotificationOpen(false); setProfileOpen((p) => !p); }}
                    aria-label="Profile menu"
                  >
                    <span className="nv-avatar-ring">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={currentProfile?.name || "User"} className="nv-avatar-img" />
                      ) : (
                        <span className="nv-avatar-init">{userInitial}</span>
                      )}
                    </span>
                    <span className="nv-profile-info">
                      <span className="nv-profile-name">{currentProfile?.name || "User"}</span>
                      <span className="nv-profile-sub">{currentProfile?.publicId || "Student"}</span>
                    </span>
                    <span className={`nv-caret ${profileOpen ? "is-up" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  {/* profile dropdown */}
                  <div className="nv-profile-panel">
                    <div className="nv-profile-panel-arrow" />
                    <div className="nv-profile-panel-head">
                      <span className="nv-pm-ring">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={currentProfile?.name || "User"} className="nv-pm-avatar-img" />
                        ) : (
                          <span className="nv-pm-avatar-init">{userInitial}</span>
                        )}
                      </span>
                      <div>
                        <div className="nv-pm-name">{currentProfile?.name || "User"}</div>
                        <div className="nv-pm-email">{currentProfile?.email || ""}</div>
                      </div>
                    </div>

                    <div className="nv-pm-divider" />

                    {isAdmin ? (
                      <>
                        {["/admin", "/admin/profile", "/admin/users", "/admin/listings", "/admin/support", "/admin/audit"].map((to, i) => (
                          <Link key={to} to={to} className="nv-pm-item" style={{ "--di": i }}>
                            {["Admin Dashboard", "Admin Profile", "Manage Users", "Listings", "Support Tickets", "Audit Logs"][i]}
                          </Link>
                        ))}
                      </>
                    ) : (
                      <>
                        <Link to="/dashboard" className="nv-pm-item" style={{ "--di": 0 }}>Dashboard</Link>
                        <Link to="/edit-profile" className="nv-pm-item" style={{ "--di": 1 }}>Edit Profile</Link>
                        <Link to="/support/my" className="nv-pm-item" style={{ "--di": 2 }}>My Support Tickets</Link>
                      </>
                    )}

                    <div className="nv-pm-divider" />
                    <button type="button" className="nv-pm-item nv-pm-logout" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className={`nv-link ${isActive("/login") ? "is-active" : ""}`}>Login</Link>
                <Link to="/register" className="nv-register-btn">
                  Get Started
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
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