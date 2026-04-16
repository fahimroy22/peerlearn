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

  const getStatusBadgeClass = (status) => {
    if (status === "accepted") return "badge badge-green";
    if (status === "pending") return "badge badge-yellow";
    if (status === "rejected") return "badge badge-red";
    return "badge badge-blue";
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
      ...(name === "deliveryMode" && value === "online"
        ? { location: "" }
        : {}),
      ...(name === "deliveryMode" && value === "offline"
        ? { roomUrl: "" }
        : {}),
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
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        deliveryMode: sessionForm.deliveryMode,
        roomUrl:
          sessionForm.deliveryMode === "online" ? sessionForm.roomUrl.trim() : "",
        location:
          sessionForm.deliveryMode === "offline" ? sessionForm.location.trim() : "",
      });

      showToast("Session created successfully", "success");
      closeSessionForm();
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to create session",
        "error"
      );
    }
  };

  return (
    <div className="page">
      <div className="listing-page-header">
        <h1 className="page-title">Requests</h1>
        <p className="listing-page-subtitle">
          Review incoming tutoring requests, track sent requests, open the related
          chat, and create sessions after a request is accepted.
        </p>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "incoming" ? "active" : ""}`}
          onClick={() => setActiveTab("incoming")}
        >
          Incoming Requests
        </button>

        <button
          className={`tab-btn ${activeTab === "sent" ? "active" : ""}`}
          onClick={() => setActiveTab("sent")}
        >
          Sent Requests
        </button>
      </div>

      {visibleRequests.length === 0 ? (
        <div className="empty-state request-empty">
          {activeTab === "incoming" ? "No incoming requests yet." : "No sent requests yet."}
        </div>
      ) : (
        <div className="requests-list">
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
              <div key={request._id} className="card request-card">
                <div className="request-card-header">
                  <div>
                    <h2 className="request-card-title">
                      {listing?.skillName || "Untitled Request"}
                    </h2>
                    <p className="request-card-subtitle">
                      {getRequestTypeLabel(request)}
                    </p>
                  </div>

                  <div className="request-card-badges">
                    <span className="badge badge-blue">
                      {isIncoming ? "Incoming" : "Sent"}
                    </span>
                    <span className={getStatusBadgeClass(request.status)}>
                      {request.status}
                    </span>
                  </div>
                </div>

                <div className="request-content-grid">
                  <div className="request-panel">
                    <div className="request-panel-title">Request Message</div>
                    <div className="request-message-box">
                      {request.message || "No message provided."}
                    </div>
                  </div>

                  <div className="request-panel">
                    <div className="request-panel-title">Details</div>

                    <div className="request-meta-list">
                      <div className="request-meta-row">
                        <span className="label">{primaryLabel}</span>
                        <span>{primaryPerson?.name || "N/A"}</span>
                      </div>

                      <div className="request-meta-row">
                        <span className="label">Email</span>
                        <span>{primaryPerson?.email || "N/A"}</span>
                      </div>

                      <div className="request-meta-row">
                        <span className="label">User ID</span>
                        <span>{primaryPerson?.publicId || "No ID yet"}</span>
                      </div>

                      <div className="request-meta-row">
                        <span className="label">Skill</span>
                        <span>{listing?.skillName || "N/A"}</span>
                      </div>

                      <div className="request-meta-row">
                        <span className="label">Status</span>
                        <span className={getStatusBadgeClass(request.status)}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="request-actions">
                  <Link className="inline-link" to={`/request-chat/${request._id}`}>
                    Open Chat
                  </Link>

                  {isPendingIncoming && (
                    <div className="request-action-buttons">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleAcceptRequest(request._id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleRejectRequest(request._id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  )}

                  {canCreateSession(request) && !isSessionFormOpen && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openSessionForm(request._id)}
                    >
                      Create Session
                    </button>
                  )}
                </div>

                {canCreateSession(request) && isSessionFormOpen && (
                  <div className="request-session-form">
                    <h3 className="request-session-form-title">Schedule Session</h3>

                    {suggestedSlots.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <div className="request-panel-title">Suggested Slots</div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginTop: "10px",
                          }}
                        >
                          {suggestedSlots.map((slot) => (
                            <button
                              key={`${slot.startTime}-${slot.endTime}`}
                              type="button"
                              className="btn-secondary"
                              onClick={() => applySuggestedSlot(slot)}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {availability.length === 0 && (
                      <div className="listing-guidance-box" style={{ marginBottom: "16px" }}>
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

                    <div className="request-session-form-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleCreateSession(request._id)}
                      >
                        Save Session
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={closeSessionForm}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Requests;