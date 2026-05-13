import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Requests() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("incoming");
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const [sessionFormRequestId, setSessionFormRequestId] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    startTime: "",
    endTime: "",
    deliveryMode: "online",
    roomUrl: "",
    location: "",
  });

  const [availability, setAvailability] = useState([]);
  const [suggestedSlots, setSuggestedSlots] = useState([]);

  const fetchRequests = async () => {
    try {
      const [incomingRes, sentRes] = await Promise.all([
        api.get("/requests/my-received"),
        api.get("/requests/my-sent"),
      ]);

      setIncomingRequests(incomingRes.data || []);
      setSentRequests(sentRes.data || []);
    } catch (error) {
      console.error("Failed to load requests", error);
      showToast("Failed to load requests", "error");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const visibleRequests = useMemo(() => {
    const requests = activeTab === "incoming" ? incomingRequests : sentRequests;
    return [...requests].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [activeTab, incomingRequests, sentRequests]);

  const incomingCount = incomingRequests.length;
  const sentCount = sentRequests.length;
  const pendingCount = [...incomingRequests, ...sentRequests].filter(
    (request) => request.status === "pending"
  ).length;
  const acceptedCount = [...incomingRequests, ...sentRequests].filter(
    (request) => request.status === "accepted"
  ).length;

  const getStatusBadgeClass = (status) => {
    if (status === "accepted") return "request-status-badge status-accepted";
    if (status === "pending") return "request-status-badge status-pending";
    if (status === "rejected") return "request-status-badge status-rejected";
    return "request-status-badge status-info";
  };

  const getRequestTypeLabel = (request) => {
    if (request?.source === "learn-listing") return "Learner listing request";
    return "Normal tutor listing request";
  };

  const canCreateSession = (request) => {
    const tutorId =
      typeof request.tutor === "string" ? request.tutor : request.tutor?._id;

    return (
      activeTab === "incoming" &&
      request.status === "accepted" &&
      user?._id === tutorId
    );
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      await api.patch(`/requests/${requestId}/accept`);

      setIncomingRequests((prev) =>
        prev.map((request) =>
          request._id === requestId ? { ...request, status: "accepted" } : request
        )
      );

      showToast("Request accepted successfully", "success");
    } catch (error) {
      console.error("Failed to accept request", error);
      showToast(
        error.response?.data?.message || "Failed to accept request",
        "error"
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      await api.patch(`/requests/${requestId}/reject`);

      setIncomingRequests((prev) =>
        prev.map((request) =>
          request._id === requestId ? { ...request, status: "rejected" } : request
        )
      );

      showToast("Request rejected successfully", "success");
    } catch (error) {
      console.error("Failed to reject request", error);
      showToast(
        error.response?.data?.message || "Failed to reject request",
        "error"
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const formatTime12Hour = (time) => {
    if (!time || !time.includes(":")) return time || "";

    const [hourString, minute] = time.split(":");
    const hour = Number(hourString);

    if (Number.isNaN(hour)) return time;

    const suffix = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 || 12;

    return `${normalizedHour}:${minute} ${suffix}`;
  };

  const toLocalDateTimeInputValue = (date) => {
    const pad = (value) => String(value).padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const createUpcomingSuggestions = (availabilityData = []) => {
    const suggestions = [];
    const now = new Date();

    for (let i = 0; i < 14; i += 1) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dayName = DAY_MAP[date.getDay()];
      const dayAvailability = availabilityData.find((item) => item.day === dayName);

      if (!dayAvailability || !Array.isArray(dayAvailability.slots)) continue;

      dayAvailability.slots.forEach((slot) => {
        if (!slot?.start || !slot?.end) return;

        const [startHour, startMinute] = slot.start.split(":").map(Number);
        const [endHour, endMinute] = slot.end.split(":").map(Number);

        if (
          Number.isNaN(startHour) ||
          Number.isNaN(startMinute) ||
          Number.isNaN(endHour) ||
          Number.isNaN(endMinute)
        ) {
          return;
        }

        const startDate = new Date(date);
        startDate.setHours(startHour, startMinute, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(endHour, endMinute, 0, 0);

        if (endDate <= startDate || startDate <= now) return;

        suggestions.push({
          label: `${dayName}, ${startDate.toLocaleDateString()} • ${formatTime12Hour(
            slot.start
          )} - ${formatTime12Hour(slot.end)}`,
          startTime: toLocalDateTimeInputValue(startDate),
          endTime: toLocalDateTimeInputValue(endDate),
        });
      });
    }

    return suggestions.slice(0, 8);
  };

  const openSessionForm = async (requestId) => {
    setSessionFormRequestId(requestId);
    setSessionForm({
      startTime: "",
      endTime: "",
      deliveryMode: "online",
      roomUrl: "",
      location: "",
    });
    setSuggestedSlots([]);
    setAvailability([]);

    try {
      const res = await api.get(`/availability/${user._id}`);
      const fetchedAvailability = Array.isArray(res.data) ? res.data : [];
      setAvailability(fetchedAvailability);
      setSuggestedSlots(createUpcomingSuggestions(fetchedAvailability));
    } catch (error) {
      console.error("Failed to load availability", error);
      showToast("Failed to load tutor availability", "error");
    }
  };

  const closeSessionForm = () => {
    setSessionFormRequestId(null);
    setSessionForm({
      startTime: "",
      endTime: "",
      deliveryMode: "online",
      roomUrl: "",
      location: "",
    });
    setAvailability([]);
    setSuggestedSlots([]);
  };

  const handleSessionFormChange = (e) => {
    const { name, value } = e.target;
    setSessionForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "deliveryMode" && value === "online" ? { location: "" } : {}),
      ...(name === "deliveryMode" && value === "offline" ? { roomUrl: "" } : {}),
    }));
  };

  const applySuggestedSlot = (slot) => {
    setSessionForm((prev) => ({
      ...prev,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  };

  const handleCreateSession = async (requestId) => {
    try {
      if (!sessionForm.startTime || !sessionForm.endTime) {
        showToast("Please enter start time and end time", "error");
        return;
      }

      const start = new Date(sessionForm.startTime);
      const end = new Date(sessionForm.endTime);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        showToast("Please enter valid session times", "error");
        return;
      }

      if (end <= start) {
        showToast("End time must be after start time", "error");
        return;
      }

      if (sessionForm.deliveryMode === "online") {
        const roomUrl = sessionForm.roomUrl.trim();

        if (!roomUrl) {
          showToast("Please enter a Google Meet link", "error");
          return;
        }

        if (!roomUrl.includes("meet.google.com")) {
          showToast("Please enter a valid Google Meet link", "error");
          return;
        }
      }

      if (sessionForm.deliveryMode === "offline") {
        const location = sessionForm.location.trim();

        if (!location) {
          showToast("Please enter a session location", "error");
          return;
        }
      }

      await api.post("/sessions", {
        requestId,
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
        deliveryMode: sessionForm.deliveryMode,
        roomUrl: sessionForm.deliveryMode === "online" ? sessionForm.roomUrl.trim() : "",
        location:
          sessionForm.deliveryMode === "offline" ? sessionForm.location.trim() : "",
      });

      showToast("Session created successfully", "success");
      closeSessionForm();
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to create session", "error");
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === "accepted") {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    if (status === "rejected") {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    }

    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div className="page requests-page">
      <div className="requests-hero">
        <div className="requests-hero-content">
          <div className="requests-hero-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 8H17M7 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="requests-hero-title">Requests</h1>
          <p className="requests-hero-subtitle">
            Review incoming tutoring requests, track sent requests, open related chats,
            and create sessions after a request is accepted.
          </p>
        </div>

        <div className="requests-stats">
          <div className="request-stat-card request-stat-primary">
            <div className="request-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 12H16M8 16H13M8 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="request-stat-content">
              <div className="request-stat-value">{visibleRequests.length}</div>
              <div className="request-stat-label">Current View</div>
            </div>
          </div>

          <div className="request-stat-card request-stat-warning">
            <div className="request-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="request-stat-content">
              <div className="request-stat-value">{pendingCount}</div>
              <div className="request-stat-label">Pending</div>
            </div>
          </div>

          <div className="request-stat-card request-stat-success">
            <div className="request-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.75 12L10.58 14.83L16.25 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="request-stat-content">
              <div className="request-stat-value">{acceptedCount}</div>
              <div className="request-stat-label">Accepted</div>
            </div>
          </div>
        </div>
      </div>

      <div className="requests-controls">
        <div className="requests-tabs">
          <button
            className={`requests-tab ${activeTab === "incoming" ? "active" : ""}`}
            onClick={() => setActiveTab("incoming")}
          >
            <span className="requests-tab-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M12 19L7 14M12 19L17 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="requests-tab-label">Incoming Requests</span>
            {incomingCount > 0 && <span className="requests-tab-count">{incomingCount}</span>}
          </button>

          <button
            className={`requests-tab ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            <span className="requests-tab-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 19V5M12 5L7 10M12 5L17 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="requests-tab-label">Sent Requests</span>
            {sentCount > 0 && <span className="requests-tab-count">{sentCount}</span>}
          </button>
        </div>
      </div>

      {visibleRequests.length === 0 ? (
        <div className="requests-empty">
          <div className="requests-empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="requests-empty-title">No requests found</h3>
          <p className="requests-empty-text">
            {activeTab === "incoming" ? "No incoming requests yet." : "No sent requests yet."}
          </p>
        </div>
      ) : (
        <div className="requests-grid">
          {visibleRequests.map((request) => {
            const learner = request.learner;
            const tutor = request.tutor;
            const listing = request.listing;
            const isIncoming = activeTab === "incoming";

            const primaryPerson = isIncoming ? learner : tutor;
            const primaryLabel = isIncoming ? "Learner" : "Tutor";
            const isPendingIncoming = isIncoming && request.status === "pending";
            const isProcessing = processingRequestId === request._id;
            const isSessionFormOpen = sessionFormRequestId === request._id;

            return (
              <article key={request._id} className="request-card-modern request-card-animate">
                <div className="request-card-glow"></div>

                <div className="request-card-header-modern">
                  <div className="request-header-top">
                    <div className="request-type-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {isIncoming ? "Incoming" : "Sent"}
                    </div>

                    <div className="request-badges-cluster">
                      <span className={getStatusBadgeClass(request.status)}>
                        <StatusIcon status={request.status} />
                        {request.status}
                      </span>
                    </div>
                  </div>

                  <h2 className="request-title-new">
                    {listing?.skillName || "Untitled Request"}
                  </h2>
                  <p className="request-subtitle-new">{getRequestTypeLabel(request)}</p>
                </div>

                <div className="request-quick-info">
                  <div className="request-info-item request-info-primary">
                    <div className="request-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="request-info-content">
                      <span className="request-info-label">{primaryLabel}</span>
                      <span className="request-info-value">{primaryPerson?.name || "N/A"}</span>
                    </div>
                  </div>

                  <div className="request-info-item">
                    <div className="request-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 8L9.17 12.55C10.74 13.55 13.24 13.55 14.81 12.55L21.94 8.02" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="request-info-content">
                      <span className="request-info-label">Email</span>
                      <span className="request-info-value">{primaryPerson?.email || "N/A"}</span>
                    </div>
                  </div>

                  <div className="request-info-item">
                    <div className="request-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 12H16M8 16H13M8 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="request-info-content">
                      <span className="request-info-label">User ID</span>
                      <span className="request-info-value">{primaryPerson?.publicId || "No ID yet"}</span>
                    </div>
                  </div>
                </div>

                <div className="request-message-panel">
                  <div className="request-panel-title-new">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Request Message
                  </div>
                  <p className="request-message-text">
                    {request.message || "No message provided."}
                  </p>
                </div>

                <div className="request-actions-row">
                  <div className="request-actions-left">
                    <Link className="request-link-btn" to={`/request-chat/${request._id}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Open Chat
                    </Link>
                  </div>

                  <div className="request-actions-right">
                    {isPendingIncoming && (
                      <>
                        <button
                          type="button"
                          className="request-action-btn request-action-success"
                          onClick={() => handleAcceptRequest(request._id)}
                          disabled={isProcessing}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {isProcessing ? "Processing..." : "Accept"}
                        </button>

                        <button
                          type="button"
                          className="request-action-btn request-action-danger"
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={isProcessing}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          {isProcessing ? "Processing..." : "Reject"}
                        </button>
                      </>
                    )}

                    {canCreateSession(request) && !isSessionFormOpen && (
                      <button
                        type="button"
                        className="request-action-btn request-action-primary"
                        onClick={() => openSessionForm(request._id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Create Session
                      </button>
                    )}
                  </div>
                </div>

                {canCreateSession(request) && isSessionFormOpen && (
                  <div className="request-session-panel">
                    <div className="request-session-panel-header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <h3 className="request-session-panel-title">Schedule Session</h3>
                    </div>

                    {suggestedSlots.length > 0 && (
                      <div className="request-suggested-area">
                        <div className="request-panel-title-new">Suggested Slots</div>
                        <div className="request-suggested-slots">
                          {suggestedSlots.map((slot) => (
                            <button
                              key={`${slot.startTime}-${slot.endTime}`}
                              type="button"
                              className="request-slot-btn"
                              onClick={() => applySuggestedSlot(slot)}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {availability.length === 0 && (
                      <div className="request-guidance-box">
                        No tutor availability found. Add weekly availability in Edit Profile,
                        or enter a custom time manually.
                      </div>
                    )}

                    <div className="request-session-form-grid">
                      <div className="request-session-field">
                        <label htmlFor={`startTime-${request._id}`}>Start Time</label>
                        <input
                          id={`startTime-${request._id}`}
                          type="datetime-local"
                          name="startTime"
                          value={sessionForm.startTime}
                          onChange={handleSessionFormChange}
                        />
                      </div>

                      <div className="request-session-field">
                        <label htmlFor={`endTime-${request._id}`}>End Time</label>
                        <input
                          id={`endTime-${request._id}`}
                          type="datetime-local"
                          name="endTime"
                          value={sessionForm.endTime}
                          onChange={handleSessionFormChange}
                        />
                      </div>

                      <div className="request-session-field request-session-field-full">
                        <label htmlFor={`deliveryMode-${request._id}`}>Session Mode</label>
                        <select
                          id={`deliveryMode-${request._id}`}
                          name="deliveryMode"
                          value={sessionForm.deliveryMode}
                          onChange={handleSessionFormChange}
                        >
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>

                      {sessionForm.deliveryMode === "online" && (
                        <div className="request-session-field request-session-field-full">
                          <label htmlFor={`roomUrl-${request._id}`}>Google Meet Link</label>
                          <input
                            id={`roomUrl-${request._id}`}
                            type="url"
                            name="roomUrl"
                            placeholder="https://meet.google.com/..."
                            value={sessionForm.roomUrl}
                            onChange={handleSessionFormChange}
                          />
                        </div>
                      )}

                      {sessionForm.deliveryMode === "offline" && (
                        <div className="request-session-field request-session-field-full">
                          <label htmlFor={`location-${request._id}`}>Location</label>
                          <input
                            id={`location-${request._id}`}
                            type="text"
                            name="location"
                            placeholder="Enter the offline session location"
                            value={sessionForm.location}
                            onChange={handleSessionFormChange}
                          />
                        </div>
                      )}
                    </div>

                    <div className="request-session-actions">
                      <button
                        type="button"
                        className="request-panel-submit"
                        onClick={() => handleCreateSession(request._id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Save Session
                      </button>

                      <button
                        type="button"
                        className="request-action-btn request-action-secondary"
                        onClick={closeSessionForm}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Requests;
