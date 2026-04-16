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
      <div className="listing-page-header">
        <h1 className="page-title">My Sessions</h1>
        <p className="listing-page-subtitle">
          Track upcoming meetings, manage schedule changes, and keep reviews and
          communication organized in one place.
        </p>
      </div>

      <div className="tabs" style={{ marginBottom: "16px" }}>
        <button
          className={`tab-btn ${sessionTab === "regular" ? "active" : ""}`}
          onClick={() => setSessionTab("regular")}
        >
          Regular Sessions
          {regularCount > 0 && <span className="chats-tab-count">{regularCount}</span>}
        </button>

        <button
          className={`tab-btn ${sessionTab === "exchange" ? "active" : ""}`}
          onClick={() => setSessionTab("exchange")}
        >
          Exchange Sessions
          {exchangeCount > 0 && <span className="chats-tab-count">{exchangeCount}</span>}
        </button>
      </div>

      <div className="card sessions-toolbar">
        <div className="sessions-toolbar-grid">
          <div>
            <label className="session-field-label">Filter</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="session-field-label">Sort</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="empty-state">No sessions found</div>
      ) : (
        <div className="sessions-list">
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
              <article key={session._id} className={`card ${getCardClass(session.status)}`}>
                <div className="session-card-inner">
                  <div className="session-card-header">
                    <div>
                      <h2 className="session-card-title">{title}</h2>
                      <p className="session-card-subtitle">{subtitle}</p>
                    </div>

                    <div className="session-card-badges">
                      <span className="badge badge-yellow">
                        {session.sessionType === "exchange" ? "exchange" : "regular"}
                      </span>
                      <span className="badge badge-blue">
                        {session.deliveryMode || "online"}
                      </span>
                      <span className={getStatusBadgeClass(session.status)}>
                        {session.status}
                      </span>
                      {meetLink && (
                        <span className="badge badge-green">Meet Ready</span>
                      )}
                    </div>
                  </div>

                  <div className="session-summary-strip">
                    <div className="session-summary-item">
                      <span className="session-summary-label">When</span>
                      <strong className="session-summary-value">
                        {formatTimeRange(session.startTime, session.endTime)}
                      </strong>
                    </div>

                    <div className="session-summary-item">
                      <span className="session-summary-label">Participant</span>
                      <strong className="session-summary-value">
                        {otherPerson?.name || "N/A"}
                      </strong>
                    </div>

                    <div className="session-summary-item">
                      <span className="session-summary-label">
                        {isOnlineSession ? "Google Meet" : "Location"}
                      </span>
                      <strong className="session-summary-value">
                        {isOnlineSession
                          ? meetLink
                            ? "Ready"
                            : "Unavailable"
                          : session.location || "Unavailable"}
                      </strong>
                    </div>
                  </div>

                  <div className="session-meta-grid">
                    <div className="session-meta-card">
                      <span className="session-meta-title">Session Details</span>

                      <div className="session-meta-row">
                        <span>Tutor</span>
                        <span>{session.tutor?.name || "N/A"}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>Learner</span>
                        <span>{session.learner?.name || "N/A"}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>Type</span>
                        <span>{session.sessionType || "regular"}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>Mode</span>
                        <span>{session.deliveryMode || "online"}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>Start</span>
                        <span>{formatDateTime(session.startTime)}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>End</span>
                        <span>{formatDateTime(session.endTime)}</span>
                      </div>
                    </div>

                    <div className="session-meta-card">
                      <span className="session-meta-title">Participant Info</span>

                      <div className="session-meta-row">
                        <span>Chat With</span>
                        <span>{otherPerson?.name || "N/A"}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>Email</span>
                        <span>{otherPerson?.email || "N/A"}</span>
                      </div>

                      <div className="session-meta-row">
                        <span>User ID</span>
                        <span>{otherPerson?.publicId || "No ID yet"}</span>
                      </div>

                      {isOnlineSession ? (
                        <div className="session-meta-row">
                          <span>Meet Link</span>
                          <span>{meetLink ? "Available" : "Unavailable"}</span>
                        </div>
                      ) : (
                        <div className="session-meta-row">
                          <span>Location</span>
                          <span>{session.location || "Unavailable"}</span>
                        </div>
                      )}

                      <div className="session-meta-row">
                        <span>Status</span>
                        <span className={getStatusBadgeClass(session.status)}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="session-actions-wrap">
                    <div className="session-actions session-actions-secondary">
                      <Link className="inline-link" to={chatLink}>
                        {session.sessionType === "exchange" ? "Open Exchange Chats" : "Open Chat"}
                      </Link>
                    </div>

                    <div className="session-actions session-actions-primary">
                      <button
                        className="btn-secondary"
                        onClick={() => handleDownloadToken(session)}
                      >
                        Download Token
                      </button>

                      {session.status === "scheduled" && meetLink && (
                        <a
                          href={meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-join-call"
                        >
                          Join Meet Session
                        </a>
                      )}

                      {canComplete && (
                        <button
                          className="success"
                          onClick={() => handleComplete(session._id)}
                        >
                          Mark Completed
                        </button>
                      )}

                      {canEdit && (
                        <>
                          <button
                            className="secondary"
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
                            {isRescheduleOpen ? "Close Reschedule" : "Reschedule"}
                          </button>

                          <button
                            className="danger"
                            onClick={() => handleCancel(session._id)}
                          >
                            Cancel Session
                          </button>
                        </>
                      )}

                      {canDelete && (
                        <button
                          className="danger"
                          onClick={() => handleOpenDeleteModal(session._id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete Session"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isRescheduleOpen && (
                    <div className="review-card session-panel">
                      <h3 className="session-panel-title">Reschedule Session</h3>

                      <div className="form-grid">
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

                        <div className="session-actions session-actions-primary">
                          <button onClick={() => handleReschedule(session._id)}>
                            Save New Time
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="review-card session-panel">
                      <h3 className="session-panel-title">Leave a Review</h3>

                      <div className="form-grid">
                        <select
                          value={reviewForms[session._id]?.rating || 5}
                          onChange={(e) =>
                            handleReviewChange(session._id, "rating", e.target.value)
                          }
                        >
                          <option value={5}>5</option>
                          <option value={4}>4</option>
                          <option value={3}>3</option>
                          <option value={2}>2</option>
                          <option value={1}>1</option>
                        </select>

                        <textarea
                          placeholder="Write a review"
                          value={reviewForms[session._id]?.comment || ""}
                          onChange={(e) =>
                            handleReviewChange(session._id, "comment", e.target.value)
                          }
                        />

                        <div className="session-actions session-actions-primary">
                          <button onClick={() => handleSubmitReview(session)}>
                            Submit Review
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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