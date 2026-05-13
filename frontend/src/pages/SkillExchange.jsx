import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function SkillExchange() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("browse");
  const [loadingRequestId, setLoadingRequestId] = useState("");
  const [processingRequestId, setProcessingRequestId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [exchangeSessionForms, setExchangeSessionForms] = useState({});

  const [formData, setFormData] = useState({
    offerSkill: "",
    wantSkill: "",
    offerDescription: "",
    wantDescription: "",
    offerLevel: "beginner",
    wantedLevel: "any",
    mode: "online",
  });

  const fetchSkillExchangeData = async () => {
    try {
      const [postsRes, receivedRes, sentRes] = await Promise.all([
        api.get("/skill-exchanges"),
        user ? api.get("/exchange-requests/my-received") : Promise.resolve({ data: [] }),
        user ? api.get("/exchange-requests/my-sent") : Promise.resolve({ data: [] }),
      ]);
      setPosts(postsRes.data || []);
      setReceivedRequests(receivedRes.data || []);
      setSentRequests(sentRes.data || []);
    } catch (error) {
      console.error("Failed to load skill exchange data", error);
      showToast("Failed to load skill exchange data", "error");
    }
  };

  useEffect(() => {
    fetchSkillExchangeData();
  }, [user]);

  const sentExchangeIds = useMemo(() => {
    return new Set((sentRequests || []).map((req) => req.exchange?._id).filter(Boolean));
  }, [sentRequests]);

  const filteredPosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) => {
      const searchableText = [
        post.offerSkill,
        post.wantSkill,
        post.offerDescription,
        post.wantDescription,
        post.offerLevel,
        post.wantedLevel,
        post.mode,
        post.status,
        post.owner?.name,
        post.owner?.email,
        post.owner?.publicId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(q);
    });
  }, [posts, searchTerm]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await api.post("/skill-exchanges", formData);
      setFormData({
        offerSkill: "",
        wantSkill: "",
        offerDescription: "",
        wantDescription: "",
        offerLevel: "beginner",
        wantedLevel: "any",
        mode: "online",
      });
      showToast("Skill exchange post created successfully", "success");
      fetchSkillExchangeData();
      setActiveTab("browse");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to create skill exchange post", "error");
    }
  };

  const handleSendRequest = async (exchangeId) => {
    try {
      setLoadingRequestId(exchangeId);
      await api.post("/exchange-requests", {
        exchangeId,
        message: "I would like to exchange skills with you.",
      });
      showToast("Exchange request sent successfully", "success");
      fetchSkillExchangeData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to send exchange request", "error");
    } finally {
      setLoadingRequestId("");
    }
  };

  const handleAccept = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      await api.patch(`/exchange-requests/${requestId}/accept`);
      showToast("Exchange request accepted", "success");
      fetchSkillExchangeData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to accept request", "error");
    } finally {
      setProcessingRequestId("");
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      await api.patch(`/exchange-requests/${requestId}/reject`);
      showToast("Exchange request rejected", "success");
      fetchSkillExchangeData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to reject request", "error");
    } finally {
      setProcessingRequestId("");
    }
  };

  const handleOpenExchangeChat = async (requestId) => {
    try {
      const res = await api.post(`/exchange-conversations/from-request/${requestId}`);
      if (res.data?._id) {
        navigate(`/exchange-chat/${res.data._id}`);
      } else {
        showToast("Failed to open exchange chat", "error");
      }
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to open exchange chat", "error");
    }
  };

  const handleExchangeSessionFieldChange = (requestId, field, value) => {
    setExchangeSessionForms((prev) => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value,
        ...(field === "deliveryMode" && value === "online" ? { location: "" } : {}),
        ...(field === "deliveryMode" && value === "offline" ? { roomUrl: "" } : {}),
      },
    }));
  };

  const handleCreateExchangeSession = async (requestId) => {
    try {
      const form = exchangeSessionForms[requestId] || {};
      if (!form.startTime || !form.endTime) {
        showToast("Please enter start time and end time", "error");
        return;
      }
      if (form.deliveryMode === "offline") {
        if (!String(form.location || "").trim()) {
          showToast("Please enter a location for the offline session", "error");
          return;
        }
      } else {
        if (!String(form.roomUrl || "").trim()) {
          showToast("Please enter a Google Meet link", "error");
          return;
        }
        if (!String(form.roomUrl || "").includes("meet.google.com")) {
          showToast("Please enter a valid Google Meet link", "error");
          return;
        }
      }
      await api.post("/sessions/exchange", {
        exchangeRequestId: requestId,
        startTime: form.startTime,
        endTime: form.endTime,
        deliveryMode: form.deliveryMode || "online",
        roomUrl: (form.deliveryMode || "online") === "online" ? form.roomUrl : "",
        location: (form.deliveryMode || "online") === "offline" ? form.location : "",
      });
      showToast("Exchange session created successfully", "success");
      setExchangeSessionForms((prev) => ({
        ...prev,
        [requestId]: {
          ...prev[requestId],
          open: false,
          startTime: "",
          endTime: "",
          deliveryMode: "online",
          roomUrl: "",
          location: "",
        },
      }));
      navigate("/sessions");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to create exchange session", "error");
    }
  };

  const getLevelBadgeClass = (level) => {
    if (level === "advanced") return "exchange-level-badge level-advanced";
    if (level === "intermediate") return "exchange-level-badge level-intermediate";
    if (level === "any") return "exchange-level-badge level-any";
    return "exchange-level-badge level-beginner";
  };

  const getStatusBadgeClass = (status) => {
    if (status === "open") return "exchange-status-badge status-open";
    if (status === "accepted" || status === "matched") return "exchange-status-badge status-accepted";
    if (status === "pending") return "exchange-status-badge status-pending";
    if (status === "rejected" || status === "closed") return "exchange-status-badge status-closed";
    return "exchange-status-badge status-info";
  };

  const tabs = [
    { id: "browse", label: "Browse", count: posts.length },
    ...(user
      ? [
          { id: "create", label: "Create Post" },
          { id: "received", label: "Received", count: receivedRequests.length },
          { id: "sent", label: "Sent", count: sentRequests.length },
        ]
      : []),
  ];

  const openPostsCount = posts.filter((post) => post.status === "open").length;
  const acceptedRequestsCount = [...receivedRequests, ...sentRequests].filter(
    (request) => request.status === "accepted"
  ).length;

  const ExchangeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 9.5L7.5 14.5M7.5 9.5L16.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.01 20.94L3.78 17.27C2.79 16.64 2 15.21 2 14.05V9.94C2 8.78 2.79 7.35 3.78 6.72L9.01 3.05C9.98 2.43 11.5 2.43 12.47 3.05L17.7 6.72C18.69 7.35 19.48 8.78 19.48 9.94V14.05C19.48 15.21 18.69 16.64 17.7 17.27L12.47 20.94C11.5 21.57 9.98 21.57 9.01 20.94Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const StatusIcon = ({ status }) => {
    if (status === "open" || status === "accepted" || status === "matched") {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    if (status === "rejected" || status === "closed") {
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

  const RequestCard = ({ request, direction }) => {
    const isProcessing = processingRequestId === request._id;
    const sessionForm = exchangeSessionForms[request._id] || {};
    const isSessionFormOpen = Boolean(sessionForm.open);
    const person = direction === "received" ? request.sender : request.receiver;
    const personLabel = direction === "received" ? "Requester" : "Receiver";

    return (
      <article className="exchange-request-card">
        <div className="exchange-card-glow"></div>

        <div className="exchange-request-header">
          <div>
            <div className="exchange-type-badge">
              <ExchangeIcon />
              {direction === "received" ? "Received Request" : "Sent Request"}
            </div>
            <h2 className="exchange-title-new">{request.exchange?.offerSkill || "Skill Exchange"}</h2>
            <p className="exchange-subtitle-new">
              Wants: <strong>{request.exchange?.wantSkill || "N/A"}</strong>
            </p>
          </div>

          <span className={getStatusBadgeClass(request.status)}>
            <StatusIcon status={request.status} />
            {request.status}
          </span>
        </div>

        <div className="exchange-request-grid">
          <div className="exchange-panel">
            <div className="exchange-panel-title">Message</div>
            <div className="exchange-message-box">{request.message || "No message provided."}</div>
          </div>

          <div className="exchange-panel">
            <div className="exchange-panel-title">{personLabel}</div>
            <div className="exchange-meta-list">
              <div className="exchange-meta-row">
                <span>Name</span>
                <strong>{person?.name || "N/A"}</strong>
              </div>
              <div className="exchange-meta-row">
                <span>Email</span>
                <strong>{person?.email || "N/A"}</strong>
              </div>
              <div className="exchange-meta-row">
                <span>User ID</span>
                <strong>{person?.publicId || "No ID yet"}</strong>
              </div>
            </div>
          </div>
        </div>

        {direction === "received" && request.status === "pending" && (
          <div className="exchange-actions-row">
            <button
              className="exchange-action-btn exchange-action-success"
              onClick={() => handleAccept(request._id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="exchange-spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <StatusIcon status="accepted" />
                  Accept
                </>
              )}
            </button>

            <button
              className="exchange-action-btn exchange-action-danger"
              onClick={() => handleReject(request._id)}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Reject"}
            </button>
          </div>
        )}

        {request.status === "accepted" && (
          <>
            <div className="exchange-actions-row">
              <button
                className="exchange-action-btn exchange-action-primary"
                onClick={() => handleOpenExchangeChat(request._id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Open Chat
              </button>

              {direction === "received" && (
                <button
                  className="exchange-action-btn exchange-action-secondary"
                  onClick={() =>
                    setExchangeSessionForms((prev) => ({
                      ...prev,
                      [request._id]: {
                        ...prev[request._id],
                        open: !prev[request._id]?.open,
                        startTime: prev[request._id]?.startTime || "",
                        endTime: prev[request._id]?.endTime || "",
                        deliveryMode: prev[request._id]?.deliveryMode || "online",
                        roomUrl: prev[request._id]?.roomUrl || "",
                        location: prev[request._id]?.location || "",
                      },
                    }))
                  }
                >
                  {isSessionFormOpen ? "Close Session Form" : "Create Session"}
                </button>
              )}
            </div>

            {direction === "received" && isSessionFormOpen && (
              <div className="exchange-session-panel">
                <div className="exchange-session-panel-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="exchange-session-title">Create Exchange Session</h3>
                </div>

                <div className="exchange-form-grid">
                  <div className="exchange-form-field">
                    <label>Start Time</label>
                    <input
                      type="datetime-local"
                      value={sessionForm.startTime || ""}
                      onChange={(e) =>
                        handleExchangeSessionFieldChange(request._id, "startTime", e.target.value)
                      }
                    />
                  </div>

                  <div className="exchange-form-field">
                    <label>End Time</label>
                    <input
                      type="datetime-local"
                      value={sessionForm.endTime || ""}
                      onChange={(e) =>
                        handleExchangeSessionFieldChange(request._id, "endTime", e.target.value)
                      }
                    />
                  </div>

                  <div className="exchange-form-field">
                    <label>Mode</label>
                    <select
                      value={sessionForm.deliveryMode || "online"}
                      onChange={(e) =>
                        handleExchangeSessionFieldChange(request._id, "deliveryMode", e.target.value)
                      }
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div className="exchange-form-field">
                    {(sessionForm.deliveryMode || "online") === "online" ? (
                      <>
                        <label>Google Meet Link</label>
                        <input
                          type="text"
                          placeholder="https://meet.google.com/..."
                          value={sessionForm.roomUrl || ""}
                          onChange={(e) =>
                            handleExchangeSessionFieldChange(request._id, "roomUrl", e.target.value)
                          }
                        />
                      </>
                    ) : (
                      <>
                        <label>Location</label>
                        <input
                          type="text"
                          placeholder="Enter session location"
                          value={sessionForm.location || ""}
                          onChange={(e) =>
                            handleExchangeSessionFieldChange(request._id, "location", e.target.value)
                          }
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="exchange-form-actions">
                  <button
                    className="exchange-panel-submit"
                    onClick={() => handleCreateExchangeSession(request._id)}
                  >
                    Save Exchange Session
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </article>
    );
  };

  return (
    <div className="page exchange-page">
      <div className="exchange-hero">
        <div className="exchange-hero-content">
          <div className="exchange-hero-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M16.5 9.5L7.5 14.5M7.5 9.5L16.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.01 20.94L3.78 17.27C2.79 16.64 2 15.21 2 14.05V9.94C2 8.78 2.79 7.35 3.78 6.72L9.01 3.05C9.98 2.43 11.5 2.43 12.47 3.05L17.7 6.72C18.69 7.35 19.48 8.78 19.48 9.94V14.05C19.48 15.21 18.69 16.64 17.7 17.27L12.47 20.94C11.5 21.57 9.98 21.57 9.01 20.94Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="exchange-hero-title">Skill Exchange</h1>
          <p className="exchange-hero-subtitle">
            Offer one skill, request another, and connect with peers for mutual learning.
          </p>
        </div>

        <div className="exchange-stats">
          <div className="exchange-stat-card exchange-stat-primary">
            <div className="exchange-stat-icon">
              <ExchangeIcon />
            </div>
            <div className="exchange-stat-content">
              <div className="exchange-stat-value">{posts.length}</div>
              <div className="exchange-stat-label">Exchange Posts</div>
            </div>
          </div>

          <div className="exchange-stat-card exchange-stat-info">
            <div className="exchange-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="exchange-stat-content">
              <div className="exchange-stat-value">{openPostsCount}</div>
              <div className="exchange-stat-label">Open Posts</div>
            </div>
          </div>

          <div className="exchange-stat-card exchange-stat-success">
            <div className="exchange-stat-icon">
              <StatusIcon status="accepted" />
            </div>
            <div className="exchange-stat-content">
              <div className="exchange-stat-value">{acceptedRequestsCount}</div>
              <div className="exchange-stat-label">Accepted Requests</div>
            </div>
          </div>
        </div>
      </div>

      <div className="exchange-controls">
        <div className="exchange-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`exchange-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="exchange-tab-icon">
                <ExchangeIcon />
              </span>
              <span className="exchange-tab-label">{t.label}</span>
              {typeof t.count === "number" && t.count > 0 && (
                <span className="exchange-tab-count">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "browse" && (
          <div className="exchange-search-box">
            <span className="exchange-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by offered skill, wanted skill, user, email, ID, level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="exchange-search-input"
            />
            {searchTerm && (
              <button
                className="exchange-search-clear"
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === "browse" && (
        <div>
          <div className="exchange-results-meta">
            <span>
              <strong>{filteredPosts.length}</strong> of <strong>{posts.length}</strong> exchange posts
            </span>
            {searchTerm && (
              <span>
                for <em>"{searchTerm}"</em>
              </span>
            )}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="exchange-empty">
              <div className="exchange-empty-icon">
                <ExchangeIcon />
              </div>
              <h3 className="exchange-empty-title">No exchange posts found</h3>
              <p className="exchange-empty-text">
                Try a different search term or create your own post.
              </p>
              {searchTerm && (
                <button className="exchange-action-btn exchange-action-secondary" onClick={() => setSearchTerm("")}>
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="exchange-grid">
              {filteredPosts.map((post, idx) => {
                const isOwnPost = String(user?._id) === String(post.owner?._id);
                const alreadyRequested = sentExchangeIds.has(post._id);
                const isLoading = loadingRequestId === post._id;

                return (
                  <article key={post._id} className="exchange-card exchange-card-animate" style={{ "--card-i": idx }}>
                    <div className="exchange-card-glow"></div>

                    <div className="exchange-swap-panel">
                      <div className="exchange-skill-block">
                        <span className="exchange-skill-label">Offers</span>
                        <strong className="exchange-skill-name">{post.offerSkill}</strong>
                        <span className={getLevelBadgeClass(post.offerLevel)}>{post.offerLevel}</span>
                      </div>

                      <div className="exchange-swap-icon">
                        <ExchangeIcon />
                      </div>

                      <div className="exchange-skill-block exchange-skill-block-right">
                        <span className="exchange-skill-label">Wants</span>
                        <strong className="exchange-skill-name">{post.wantSkill}</strong>
                        <span className={getLevelBadgeClass(post.wantedLevel)}>{post.wantedLevel}</span>
                      </div>
                    </div>

                    <div className="exchange-owner-row">
                      <div className="exchange-owner-left">
                       {post.owner?.avatar ? (
  <img
    src={post.owner.avatar}
    alt={post.owner?.name || "User"}
    className="exchange-avatar"
  />
) : (
  <div className="exchange-avatar exchange-avatar-initials">
    {post.owner?.name?.charAt(0)?.toUpperCase() || "U"}
  </div>
)}
                        <div className="exchange-owner-info">
                          <span className="exchange-owner-name">{post.owner?.name || "Unknown user"}</span>
                          <span className="exchange-owner-id">{post.owner?.publicId || "No ID yet"}</span>
                        </div>
                      </div>

                      <div className="exchange-badges-cluster">
                        <span className="exchange-mode-badge">{post.mode}</span>
                        <span className={getStatusBadgeClass(post.status)}>
                          <StatusIcon status={post.status} />
                          {post.status}
                        </span>
                      </div>
                    </div>

                    <div className="exchange-description-grid">
                      {post.offerDescription && (
                        <div className="exchange-description-panel">
                          <div className="exchange-panel-title">Offer</div>
                          <p>{post.offerDescription}</p>
                        </div>
                      )}

                      {post.wantDescription && (
                        <div className="exchange-description-panel">
                          <div className="exchange-panel-title">Want</div>
                          <p>{post.wantDescription}</p>
                        </div>
                      )}
                    </div>

                    <div className="exchange-contact-strip">
                      <span className="exchange-contact-dot" />
                      <div>
                        <span className="exchange-contact-name">{post.owner?.email || "No email"}</span>
                        <span className="exchange-contact-meta">ID: {post.owner?.publicId || "—"}</span>
                      </div>
                    </div>

                    <div className="exchange-actions-row">
                      {!user ? (
                        <div className="exchange-notice">Sign in to send an exchange request.</div>
                      ) : isOwnPost ? (
                        <div className="exchange-notice">This is your own exchange post.</div>
                      ) : (
                        <button
                          className={`exchange-action-btn exchange-action-primary ${
                            alreadyRequested ? "is-done" : ""
                          } ${post.status !== "open" ? "is-unavailable" : ""}`}
                          onClick={() => handleSendRequest(post._id)}
                          disabled={alreadyRequested || isLoading || post.status !== "open"}
                        >
                          {isLoading ? (
                            <>
                              <span className="exchange-spinner" />
                              Sending...
                            </>
                          ) : alreadyRequested ? (
                            <>
                              <StatusIcon status="accepted" />
                              Requested
                            </>
                          ) : post.status !== "open" ? (
                            "Unavailable"
                          ) : (
                            <>
                              <ExchangeIcon />
                              Propose Exchange
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && user && (
        <div className="exchange-create-panel">
          <div className="exchange-session-panel-header">
            <ExchangeIcon />
            <div>
              <h2 className="exchange-session-title">Create Skill Exchange Post</h2>
              <p className="exchange-panel-subtitle">
                Tell others what you can teach and what you want to learn.
              </p>
            </div>
          </div>

          <form className="exchange-create-form" onSubmit={handleCreatePost}>
            <div className="exchange-form-grid">
              <div className="exchange-form-field">
                <label>Skill you can offer</label>
                <input
                  type="text"
                  name="offerSkill"
                  placeholder="e.g. Python, Guitar, Design..."
                  value={formData.offerSkill}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="exchange-form-field">
                <label>Skill you want to learn</label>
                <input
                  type="text"
                  name="wantSkill"
                  placeholder="e.g. React, Piano, Marketing..."
                  value={formData.wantSkill}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="exchange-form-field">
                <label>Describe what you can teach</label>
                <textarea
                  name="offerDescription"
                  placeholder="Your experience, approach, topics you can cover..."
                  value={formData.offerDescription}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="exchange-form-field">
                <label>Describe what you want to learn</label>
                <textarea
                  name="wantDescription"
                  placeholder="Your current level, goals, what you need help with..."
                  value={formData.wantDescription}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="exchange-form-field">
                <label>Your offer level</label>
                <select name="offerLevel" value={formData.offerLevel} onChange={handleChange}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="exchange-form-field">
                <label>Wanted level</label>
                <select name="wantedLevel" value={formData.wantedLevel} onChange={handleChange}>
                  <option value="any">Any</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="exchange-form-field exchange-form-field-full">
                <label>Mode</label>
                <select name="mode" value={formData.mode} onChange={handleChange}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            <div className="exchange-form-actions">
              <button type="submit" className="exchange-panel-submit">
                <ExchangeIcon />
                Publish Exchange Post
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "received" && user && (
        <div>
          {receivedRequests.length === 0 ? (
            <div className="exchange-empty">
              <div className="exchange-empty-icon">
                <ExchangeIcon />
              </div>
              <h3 className="exchange-empty-title">No received requests yet</h3>
              <p className="exchange-empty-text">
                When others request to exchange skills with you, they will appear here.
              </p>
            </div>
          ) : (
            <div className="exchange-requests-list">
              {receivedRequests.map((request) => (
                <RequestCard key={request._id} request={request} direction="received" />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "sent" && user && (
        <div>
          {sentRequests.length === 0 ? (
            <div className="exchange-empty">
              <div className="exchange-empty-icon">
                <ExchangeIcon />
              </div>
              <h3 className="exchange-empty-title">No sent requests yet</h3>
              <p className="exchange-empty-text">Browse exchanges and propose a skill swap.</p>
              <button className="exchange-action-btn exchange-action-primary" onClick={() => setActiveTab("browse")}>
                Browse Exchanges
              </button>
            </div>
          ) : (
            <div className="exchange-requests-list">
              {sentRequests.map((request) => (
                <RequestCard key={request._id} request={request} direction="sent" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SkillExchange;
