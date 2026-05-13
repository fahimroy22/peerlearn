import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import ConfirmModal from "../components/ConfirmModal";

function Sessions() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [sessionTab, setSessionTab] = useState("regular");
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [reviewForms, setReviewForms] = useState({});
  const [rescheduleForms, setRescheduleForms] = useState({});
  const [deletingSessionId, setDeletingSessionId] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  const fetchSessions = async () => {
    try {
      const res = await api.get("/sessions/my-sessions");
      setSessions(res.data || []);
    } catch (error) {
      console.error("Failed to load sessions", error);
      showToast("Failed to load sessions", "error");
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.patch(`/sessions/${id}/complete`);
      showToast("Session marked as completed", "success");
      fetchSessions();
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to complete session",
        "error"
      );
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.patch(`/sessions/${id}/cancel`);
      showToast("Session cancelled successfully", "success");
      fetchSessions();
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to cancel session",
        "error"
      );
    }
  };

  const handleOpenDeleteModal = (sessionId) => {
    setSelectedSessionId(sessionId);
    setShowDeleteModal(true);
  };

  const handleDeleteSession = async () => {
    if (!selectedSessionId) return;

    try {
      setDeletingSessionId(selectedSessionId);
      await api.delete(`/sessions/${selectedSessionId}`);

      setSessions((prev) =>
        prev.filter((session) => session._id !== selectedSessionId)
      );

      showToast("Session deleted successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to delete session",
        "error"
      );
    } finally {
      setDeletingSessionId("");
      setShowDeleteModal(false);
      setSelectedSessionId(null);
    }
  };

  const handleDownloadToken = async (session) => {
    try {
      const res = await api.get(`/sessions/${session._id}/token`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `peerlearn-session-token-${session._id}.pdf`;

      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast("Session token downloaded successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to download session token",
        "error"
      );
    }
  };

  const handleRescheduleChange = (sessionId, field, value) => {
    setRescheduleForms((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        [field]: value,
      },
    }));
  };

  const handleReschedule = async (sessionId) => {
    try {
      const form = rescheduleForms[sessionId] || {};

      if (!form.startTime || !form.endTime) {
        showToast("Please enter both start and end time", "error");
        return;
      }

      await api.patch(`/sessions/${sessionId}/reschedule`, {
        startTime: form.startTime,
        endTime: form.endTime,
      });

      showToast("Session rescheduled successfully", "success");

      setRescheduleForms((prev) => ({
        ...prev,
        [sessionId]: {
          startTime: "",
          endTime: "",
          open: false,
        },
      }));

      fetchSessions();
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to reschedule session",
        "error"
      );
    }
  };

  const handleReviewChange = (sessionId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        [field]: value,
      },
    }));
  };

  const handleSubmitReview = async (session) => {
    try {
      const form = reviewForms[session._id] || {};
      const revieweeId =
        user?._id === session.tutor?._id ? session.learner?._id : session.tutor?._id;

      await api.post("/reviews", {
        sessionId: session._id,
        revieweeId,
        rating: Number(form.rating) || 5,
        comment: form.comment || "",
      });

      setReviewForms((prev) => ({
        ...prev,
        [session._id]: {
          rating: 5,
          comment: "",
        },
      }));

      showToast("Review submitted successfully", "success");
      fetchSessions();
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to submit review",
        "error"
      );
    }
  };

  const toggleCardExpanded = (sessionId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const filteredSessions = useMemo(() => {
    let data = [...sessions];

    data = data.filter((s) =>
      sessionTab === "exchange"
        ? s.sessionType === "exchange"
        : (s.sessionType || "regular") === "regular"
    );

    if (filter === "upcoming") {
      data = data.filter((s) => s.status === "scheduled");
    } else if (filter === "completed") {
      data = data.filter((s) => s.status === "completed");
    } else if (filter === "cancelled") {
      data = data.filter((s) => s.status === "cancelled");
    }

    data.sort((a, b) => {
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return data;
  }, [sessions, filter, sortOrder, sessionTab]);

  const regularCount = useMemo(
    () => sessions.filter((s) => (s.sessionType || "regular") === "regular").length,
    [sessions]
  );

  const exchangeCount = useMemo(
    () => sessions.filter((s) => s.sessionType === "exchange").length,
    [sessions]
  );

  const formatDateTime = (value) => {
    return value ? new Date(value).toLocaleString() : "N/A";
  };

  const formatTimeRange = (start, end) => {
    if (!start || !end) return "Time unavailable";

    const s = new Date(start);
    const e = new Date(end);
    const sameDay = s.toDateString() === e.toDateString();

    const date = s.toLocaleDateString();
    const startTime = s.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTime = e.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (sameDay) {
      return `${date} • ${startTime} - ${endTime}`;
    }

    return `${date} • ${startTime} → ${e.toLocaleDateString()} • ${endTime}`;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "completed") return "badge badge-green";
    if (status === "scheduled") return "badge badge-blue";
    if (status === "cancelled") return "badge badge-red";
    return "badge badge-yellow";
  };

  const getCardClass = (status) => {
    if (status === "completed") return "session-card is-completed";
    if (status === "cancelled") return "session-card is-cancelled";
    return "session-card";
  };

  return (
    <div className="page sessions-page">
      <div className="sessions-hero">
        <div className="sessions-hero-content">
          <div className="sessions-hero-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.6947 13.7H15.7037M15.6947 16.7H15.7037M11.9955 13.7H12.0045M11.9955 16.7H12.0045M8.29431 13.7H8.30329M8.29431 16.7H8.30329" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="sessions-hero-title">My Sessions</h1>
          <p className="sessions-hero-subtitle">
            Track upcoming meetings, manage schedule changes, and keep reviews organized in one place.
          </p>
        </div>

        <div className="sessions-stats">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.35 15.57C16.21 15.81 15.96 15.94 15.7 15.94C15.57 15.94 15.44 15.91 15.32 15.83L12.22 13.98C11.45 13.52 10.88 12.51 10.88 11.62V7.52C10.88 7.11 11.22 6.77 11.63 6.77C12.04 6.77 12.38 7.11 12.38 7.52V11.62C12.38 11.98 12.68 12.51 12.99 12.69L16.09 14.54C16.45 14.75 16.57 15.21 16.35 15.57Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{filteredSessions.length}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>

          <div className="stat-card stat-card-success">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.78 9.7L11.11 15.37C10.97 15.51 10.78 15.59 10.58 15.59C10.38 15.59 10.19 15.51 10.05 15.37L7.22 12.54C6.93 12.25 6.93 11.77 7.22 11.48C7.51 11.19 7.99 11.19 8.28 11.48L10.58 13.78L15.72 8.64C16.01 8.35 16.49 8.35 16.78 8.64C17.07 8.93 17.07 9.4 16.78 9.7Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {sessions.filter((s) => s.status === "completed").length}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM11.25 8C11.25 7.59 11.59 7.25 12 7.25C12.41 7.25 12.75 7.59 12.75 8V13C12.75 13.41 12.41 13.75 12 13.75C11.59 13.75 11.25 13.41 11.25 13V8ZM12.92 16.38C12.87 16.51 12.8 16.61 12.71 16.71C12.61 16.8 12.5 16.87 12.38 16.92C12.26 16.97 12.13 17 12 17C11.87 17 11.74 16.97 11.62 16.92C11.5 16.87 11.39 16.8 11.29 16.71C11.2 16.61 11.13 16.51 11.08 16.38C11.03 16.26 11 16.13 11 16C11 15.87 11.03 15.74 11.08 15.62C11.13 15.5 11.2 15.39 11.29 15.29C11.39 15.2 11.5 15.13 11.62 15.08C11.86 14.98 12.14 14.98 12.38 15.08C12.5 15.13 12.61 15.2 12.71 15.29C12.8 15.39 12.87 15.5 12.92 15.62C12.97 15.74 13 15.87 13 16C13 16.13 12.97 16.26 12.92 16.38Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {sessions.filter((s) => s.status === "scheduled").length}
              </div>
              <div className="stat-label">Upcoming</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sessions-controls">
        <div className="sessions-tabs">
          <button
            className={`sessions-tab ${sessionTab === "regular" ? "active" : ""}`}
            onClick={() => setSessionTab("regular")}
          >
            <span className="sessions-tab-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15.5 18.5C16.6 18.5 17.5 17.6 17.5 16.5C17.5 15.4 16.6 14.5 15.5 14.5C14.4 14.5 13.5 15.4 13.5 16.5C13.5 17.6 14.4 18.5 15.5 18.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 9.5C9.60457 9.5 10.5 8.60457 10.5 7.5C10.5 6.39543 9.60457 5.5 8.5 5.5C7.39543 5.5 6.5 6.39543 6.5 7.5C6.5 8.60457 7.39543 9.5 8.5 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 9.5V18.5M15.5 14.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="sessions-tab-label">Regular Sessions</span>
            {regularCount > 0 && <span className="sessions-tab-count">{regularCount}</span>}
          </button>

          <button
            className={`sessions-tab ${sessionTab === "exchange" ? "active" : ""}`}
            onClick={() => setSessionTab("exchange")}
          >
            <span className="sessions-tab-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9.01 20.94L3.78 17.27C2.79 16.64 2 15.21 2 14.05V9.94C2 8.78 2.79 7.35 3.78 6.72L9.01 3.05C9.98 2.43 11.5 2.43 12.47 3.05L17.7 6.72C18.69 7.35 19.48 8.78 19.48 9.94V14.05C19.48 15.21 18.69 16.64 17.7 17.27L12.47 20.94C11.5 21.57 9.98 21.57 9.01 20.94Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.5 9.5L7.5 14.5M7.5 9.5L16.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="sessions-tab-label">Exchange Sessions</span>
            {exchangeCount > 0 && <span className="sessions-tab-count">{exchangeCount}</span>}
          </button>
        </div>

        <div className="sessions-filters">
          <div className="filter-group">
            <label className="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5.4 2.1H18.6C19.7 2.1 20.6 3 20.6 4.1V6.3C20.6 7.1 20.1 8.1 19.6 8.6L15.3 12.4C14.7 12.9 14.3 13.9 14.3 14.7V19C14.3 19.6 13.9 20.4 13.4 20.7L12 21.6C10.7 22.4 8.9 21.5 8.9 19.9V14.6C8.9 13.9 8.5 13 8.1 12.5L4.3 8.5C3.8 8 3.4 7.1 3.4 6.5V4.2C3.4 3 4.3 2.1 5.4 2.1Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Filter
            </label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Sessions</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 7H21M6 12H18M10 17H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Sort
            </label>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="sessions-empty">
          <div className="sessions-empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="sessions-empty-title">No sessions found</h3>
          <p className="sessions-empty-text">
            {filter !== "all" 
              ? `You don't have any ${filter} sessions yet.`
              : "Start by booking a session with a tutor."}
          </p>
        </div>
      ) : (
        <div className="sessions-grid">
          {filteredSessions.map((session) => {
            const canComplete =
              user?._id === session.tutor?._id &&
              session.status === "scheduled";

            const canEdit = session.status === "scheduled";
            const canDelete =
              session.status === "completed" || session.status === "cancelled";

            const isCompleted = session.status === "completed";
            const isRescheduleOpen = rescheduleForms[session._id]?.open;
            const isDeleting = deletingSessionId === session._id;
            const isExpanded = expandedCards[session._id];

            const otherPerson =
              user?._id === session.tutor?._id ? session.learner : session.tutor;

            const isTutorView = user?._id === session.tutor?._id;
            const isOnlineSession = (session.deliveryMode || "online") === "online";
            const meetLink =
              isOnlineSession && session.roomUrl?.includes("meet.google.com")
                ? session.roomUrl
                : null;

            const title =
              session.sessionType === "exchange"
                ? `${session.exchangeRequest?.exchange?.offerSkill || "Exchange"} ↔ ${
                    session.exchangeRequest?.exchange?.wantSkill || "Session"
                  }`
                : session.request?.listing?.skillName || "Session";

            const subtitle =
              session.sessionType === "exchange"
                ? `Exchange session with ${otherPerson?.name || "participant"}`
                : isTutorView
                ? `Session with ${session.learner?.name || "learner"}`
                : `Session with ${session.tutor?.name || "tutor"}`;

            const chatLink =
              session.sessionType === "exchange"
                ? "/chats"
                : `/chat/${session._id}`;

            return (
              <article key={session._id} className={`${getCardClass(session.status)} session-card-animate`}>
                <div className="session-card-glow"></div>
                
                <div className="session-card-header-new">
                  <div className="session-header-top">
                    <div className="session-type-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        {session.sessionType === "exchange" ? (
                          <path d="M16.5 9.5L7.5 14.5M7.5 9.5L16.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        ) : (
                          <path d="M8.5 9.5V18.5M15.5 14.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        )}
                      </svg>
                      {session.sessionType === "exchange" ? "Exchange" : "Regular"}
                    </div>

                    <div className="session-badges-cluster">
                      <span className={`session-status-badge status-${session.status}`}>
                        {session.status === "scheduled" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                        {session.status === "completed" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {session.status === "cancelled" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                        {session.status}
                      </span>

                      <span className="session-mode-badge">
                        {session.deliveryMode === "online" ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M2 8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 16.5L8 20.5V3.5L2 7.5V16.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 13.43C13.7231 13.43 15.12 12.0331 15.12 10.31C15.12 8.58687 13.7231 7.19 12 7.19C10.2769 7.19 8.88 8.58687 8.88 10.31C8.88 12.0331 10.2769 13.43 12 13.43Z" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M3.62001 8.49C5.59001 -0.169998 18.42 -0.159997 20.38 8.5C21.53 13.58 18.37 17.88 15.6 20.54C13.59 22.48 10.41 22.48 8.39001 20.54C5.63001 17.88 2.47001 13.57 3.62001 8.49Z" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        )}
                        {session.deliveryMode || "online"}
                      </span>

                      {meetLink && (
                        <span className="session-meet-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Meet Ready
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="session-title-new">{title}</h2>
                  <p className="session-subtitle-new">{subtitle}</p>
                </div>

                <div className="session-quick-info">
                  <div className="quick-info-item quick-info-primary">
                    <div className="quick-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.35 15.57C16.21 15.81 15.96 15.94 15.7 15.94C15.57 15.94 15.44 15.91 15.32 15.83L12.22 13.98C11.45 13.52 10.88 12.51 10.88 11.62V7.52C10.88 7.11 11.22 6.77 11.63 6.77C12.04 6.77 12.38 7.11 12.38 7.52V11.62C12.38 11.98 12.68 12.51 12.99 12.69L16.09 14.54C16.45 14.75 16.57 15.21 16.35 15.57Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="quick-info-content">
                      <span className="quick-info-label">When</span>
                      <span className="quick-info-value">{formatTimeRange(session.startTime, session.endTime)}</span>
                    </div>
                  </div>

                  <div className="quick-info-item">
                    <div className="quick-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="quick-info-content">
                      <span className="quick-info-label">With</span>
                      <span className="quick-info-value">{otherPerson?.name || "N/A"}</span>
                    </div>
                  </div>

                  <div className="quick-info-item">
                    <div className="quick-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        {isOnlineSession ? (
                          <path d="M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                        ) : (
                          <path d="M12 13.43C13.7231 13.43 15.12 12.0331 15.12 10.31C15.12 8.58687 13.7231 7.19 12 7.19C10.2769 7.19 8.88 8.58687 8.88 10.31C8.88 12.0331 10.2769 13.43 12 13.43Z" stroke="currentColor" strokeWidth="1.5"/>
                        )}
                      </svg>
                    </div>
                    <div className="quick-info-content">
                      <span className="quick-info-label">
                        {isOnlineSession ? "Google Meet" : "Location"}
                      </span>
                      <span className="quick-info-value">
                        {isOnlineSession
                          ? meetLink ? "Ready" : "Unavailable"
                          : session.location || "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="session-actions-row">
                  <div className="session-actions-left">
                    <Link className="session-link-btn" to={chatLink}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {session.sessionType === "exchange" ? "Exchange Chats" : "Open Chat"}
                    </Link>

                    <button
                      className="session-icon-btn"
                      onClick={() => toggleCardExpanded(session._id)}
                      title={isExpanded ? "Show less" : "Show more"}
                    >
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                      >
                        <path d="M19.92 8.95L13.4 15.47C12.63 16.24 11.37 16.24 10.6 15.47L4.08 8.95" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  <div className="session-actions-right">
                    <button
                      className="session-action-btn session-action-secondary"
                      onClick={() => handleDownloadToken(session)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 11V17L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 17L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Token
                    </button>

                    {session.status === "scheduled" && meetLink && (
                      <a
                        href={meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="session-action-btn session-action-meet"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12.53 20.42H6.21C3.05 20.42 2 18.32 2 16.21V7.79C2 4.63 3.05 3.58 6.21 3.58H12.53C15.69 3.58 16.74 4.63 16.74 7.79V16.21C16.74 19.37 15.68 20.42 12.53 20.42Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19.52 17.1L16.74 15.15V8.84L19.52 6.89C20.88 5.94 22 6.52 22 8.19V15.81C22 17.48 20.88 18.06 19.52 17.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Join Meet
                      </a>
                    )}

                    {canComplete && (
                      <button
                        className="session-action-btn session-action-success"
                        onClick={() => handleComplete(session._id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Complete
                      </button>
                    )}

                    {canEdit && (
                      <>
                        <button
                          className="session-action-btn session-action-warning"
                          onClick={() =>
                            setRescheduleForms((prev) => ({
                              ...prev,
                              [session._id]: {
                                ...prev[session._id],
                                open: !prev[session._id]?.open,
                                startTime: prev[session._id]?.startTime || "",
                                endTime: prev[session._id]?.endTime || "",
                              },
                            }))
                          }
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M8 2V5M16 2V5M3.5 9.09H20.5M8 13H12M8 17H12M16 13H16.01M16 17H16.01M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {isRescheduleOpen ? "Close" : "Reschedule"}
                        </button>

                        <button
                          className="session-action-btn session-action-danger"
                          onClick={() => handleCancel(session._id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9.17 14.83L14.83 9.17M14.83 14.83L9.17 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Cancel
                        </button>
                      </>
                    )}

                    {canDelete && (
                      <button
                        className="session-action-btn session-action-danger"
                        onClick={() => handleOpenDeleteModal(session._id)}
                        disabled={isDeleting}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M21 5.98C17.67 5.65 14.32 5.48 10.98 5.48C9 5.48 7.02 5.58 5.04 5.78L3 5.98M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97M18.85 9.14L18.2 19.21C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14M10.33 16.5H13.66M9.5 12.5H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="session-details-expanded">
                    <div className="session-details-grid">
                      <div className="session-detail-card">
                        <h4 className="session-detail-title">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15.5 18.5C16.6 18.5 17.5 17.6 17.5 16.5C17.5 15.4 16.6 14.5 15.5 14.5C14.4 14.5 13.5 15.4 13.5 16.5C13.5 17.6 14.4 18.5 15.5 18.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Session Details
                        </h4>
                        <div className="session-detail-rows">
                          <div className="session-detail-row">
                            <span>Tutor</span>
                            <strong>{session.tutor?.name || "N/A"}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>Learner</span>
                            <strong>{session.learner?.name || "N/A"}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>Type</span>
                            <strong>{session.sessionType || "regular"}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>Mode</span>
                            <strong>{session.deliveryMode || "online"}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>Start</span>
                            <strong>{formatDateTime(session.startTime)}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>End</span>
                            <strong>{formatDateTime(session.endTime)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="session-detail-card">
                        <h4 className="session-detail-title">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Participant Info
                        </h4>
                        <div className="session-detail-rows">
                          <div className="session-detail-row">
                            <span>Name</span>
                            <strong>{otherPerson?.name || "N/A"}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>Email</span>
                            <strong>{otherPerson?.email || "N/A"}</strong>
                          </div>
                          <div className="session-detail-row">
                            <span>User ID</span>
                            <strong>{otherPerson?.publicId || "No ID yet"}</strong>
                          </div>
                          {isOnlineSession ? (
                            <div className="session-detail-row">
                              <span>Meet Link</span>
                              <strong>{meetLink ? "Available" : "Unavailable"}</strong>
                            </div>
                          ) : (
                            <div className="session-detail-row">
                              <span>Location</span>
                              <strong>{session.location || "Unavailable"}</strong>
                            </div>
                          )}
                          <div className="session-detail-row">
                            <span>Status</span>
                            <strong className={`status-${session.status}`}>
                              {session.status}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isRescheduleOpen && (
                  <div className="session-panel-modern">
                    <div className="session-panel-header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3 className="session-panel-title">Reschedule Session</h3>
                    </div>

                    <div className="session-panel-form">
                      <div className="form-field-modern">
                        <label>New Start Time</label>
                        <input
                          type="datetime-local"
                          value={rescheduleForms[session._id]?.startTime || ""}
                          onChange={(e) =>
                            handleRescheduleChange(
                              session._id,
                              "startTime",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="form-field-modern">
                        <label>New End Time</label>
                        <input
                          type="datetime-local"
                          value={rescheduleForms[session._id]?.endTime || ""}
                          onChange={(e) =>
                            handleRescheduleChange(
                              session._id,
                              "endTime",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <button 
                        className="session-panel-submit"
                        onClick={() => handleReschedule(session._id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Save New Schedule
                      </button>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="session-panel-modern session-panel-review">
                    <div className="session-panel-header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M13.73 3.51L15.49 7.03C15.73 7.52 16.37 7.99 16.91 8.08L20.1 8.61C22.14 8.95 22.62 10.43 21.15 11.89L18.67 14.37C18.25 14.79 18.02 15.6 18.15 16.18L18.86 19.25C19.42 21.68 18.13 22.62 15.98 21.35L12.99 19.58C12.45 19.26 11.56 19.26 11.01 19.58L8.02 21.35C5.88 22.62 4.58 21.67 5.14 19.25L5.85 16.18C5.98 15.6 5.75 14.79 5.33 14.37L2.85 11.89C1.39 10.43 1.86 8.95 3.9 8.61L7.09 8.08C7.62 7.99 8.26 7.52 8.5 7.03L10.26 3.51C11.22 1.6 12.78 1.6 13.73 3.51Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3 className="session-panel-title">Leave a Review</h3>
                    </div>

                    <div className="session-panel-form">
                      <div className="form-field-modern">
                        <label>Rating</label>
                        <div className="rating-selector">
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              className={`rating-btn ${(reviewForms[session._id]?.rating || 5) === rating ? 'active' : ''}`}
                              onClick={() => handleReviewChange(session._id, "rating", rating)}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13.73 3.51L15.49 7.03C15.73 7.52 16.37 7.99 16.91 8.08L20.1 8.61C22.14 8.95 22.62 10.43 21.15 11.89L18.67 14.37C18.25 14.79 18.02 15.6 18.15 16.18L18.86 19.25C19.42 21.68 18.13 22.62 15.98 21.35L12.99 19.58C12.45 19.26 11.56 19.26 11.01 19.58L8.02 21.35C5.88 22.62 4.58 21.67 5.14 19.25L5.85 16.18C5.98 15.6 5.75 14.79 5.33 14.37L2.85 11.89C1.39 10.43 1.86 8.95 3.9 8.61L7.09 8.08C7.62 7.99 8.26 7.52 8.5 7.03L10.26 3.51C11.22 1.6 12.78 1.6 13.73 3.51Z"/>
                              </svg>
                              {rating}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-field-modern">
                        <label>Your Review</label>
                        <textarea
                          placeholder="Share your experience with this session..."
                          rows="4"
                          value={reviewForms[session._id]?.comment || ""}
                          onChange={(e) =>
                            handleReviewChange(session._id, "comment", e.target.value)
                          }
                        />
                      </div>

                      <button 
                        className="session-panel-submit"
                        onClick={() => handleSubmitReview(session)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7.75 12L10.58 14.83L16.25 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Submit Review
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Session"
        message="Are you sure you want to delete this session? Only completed or cancelled sessions can be deleted, and this action cannot be undone."
        onConfirm={handleDeleteSession}
        onCancel={() => {
          if (!deletingSessionId) {
            setShowDeleteModal(false);
            setSelectedSessionId(null);
          }
        }}
        loading={!!deletingSessionId}
      />
    </div>
  );
}

export default Sessions;