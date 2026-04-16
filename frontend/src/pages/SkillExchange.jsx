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
    return new Set(
      (sentRequests || [])
        .map((req) => req.exchange?._id)
        .filter(Boolean)
    );
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

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
      showToast(
        error.response?.data?.message || "Failed to create skill exchange post",
        "error"
      );
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
      showToast(
        error.response?.data?.message || "Failed to send exchange request",
        "error"
      );
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
      showToast(
        error.response?.data?.message || "Failed to accept request",
        "error"
      );
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
      showToast(
        error.response?.data?.message || "Failed to reject request",
        "error"
      );
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
      showToast(
        error.response?.data?.message || "Failed to open exchange chat",
        "error"
      );
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
      showToast(
        error.response?.data?.message || "Failed to create exchange session",
        "error"
      );
    }
  };

  const getLevelBadgeClass = (level) => {
    if (level === "advanced") return "badge badge-blue";
    if (level === "intermediate") return "badge badge-yellow";
    if (level === "beginner") return "badge badge-green";
    return "badge";
  };

  const getStatusBadgeClass = (status) => {
    if (status === "accepted" || status === "matched" || status === "open") {
      return "badge badge-green";
    }
    if (status === "pending") return "badge badge-yellow";
    if (status === "rejected" || status === "closed") return "badge badge-red";
    return "badge";
  };

  return (
    <div className="page">
      <div className="listing-page-header">
        <div>
          <div className="section-eyebrow">Peer-to-Peer Learning</div>
          <h1 className="page-title">Skill Exchange</h1>
          <p className="listing-page-subtitle">
            Offer one skill, request another, and connect with people for mutual learning.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "browse" ? "active" : ""}`}
          onClick={() => setActiveTab("browse")}
        >
          Browse Exchanges
        </button>

        {user && (
          <>
            <button
              className={`tab-btn ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create Post
            </button>

            <button
              className={`tab-btn ${activeTab === "received" ? "active" : ""}`}
              onClick={() => setActiveTab("received")}
            >
              Received Requests
            </button>

            <button
              className={`tab-btn ${activeTab === "sent" ? "active" : ""}`}
              onClick={() => setActiveTab("sent")}
            >
              Sent Requests
            </button>
          </>
        )}
      </div>

      {activeTab === "browse" && (
        <>
          <div className="card" style={{ marginBottom: "18px" }}>
            <h2 className="card-title" style={{ fontSize: "20px" }}>
              Search Exchange Posts
            </h2>

            <input
              type="text"
              placeholder="Search by offered skill, wanted skill, user, email, ID, level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="listing-search-meta">
              Showing {filteredPosts.length} of {posts.length} exchange posts
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="empty-state">No skill exchange posts matched your search.</div>
          ) : (
            <div className="listing-grid">
              {filteredPosts.map((post) => {
                const isOwnPost = String(user?._id) === String(post.owner?._id);
                const alreadyRequested = sentExchangeIds.has(post._id);
                const isLoading = loadingRequestId === post._id;

                return (
                  <div key={post._id} className="listing-card">
                    <div className="listing-card-top">
                      <div>
                        <h3 className="listing-skill">{post.offerSkill}</h3>
                        <p className="listing-desc">
                          Wants to learn: <strong>{post.wantSkill}</strong>
                        </p>
                      </div>

                      <div className="listing-chip-group">
                        <span className={getLevelBadgeClass(post.offerLevel)}>
                          offers: {post.offerLevel}
                        </span>
                        <span className={getLevelBadgeClass(post.wantedLevel)}>
                          wants: {post.wantedLevel}
                        </span>
                        <span className="badge badge-blue">{post.mode}</span>
                      </div>
                    </div>

                    <div className="listing-tutor-row">
                      <span className="listing-tutor-name">{post.owner?.name}</span>
                      <span className={getStatusBadgeClass(post.status)}>
                        {post.status}
                      </span>
                    </div>

                    <div className="profile-text-block" style={{ marginTop: "10px" }}>
                      <span className="listing-meta-label">Offers</span>
                      <p>{post.offerDescription || "No offer description added."}</p>
                    </div>

                    <div className="profile-text-block" style={{ marginTop: "10px" }}>
                      <span className="listing-meta-label">Wants</span>
                      <p>{post.wantDescription || "No wanted skill description added."}</p>
                    </div>

                    <div className="listing-divider" />

                    <div className="listing-meta-grid">
                      <div className="listing-meta-item">
                        <span className="listing-meta-label">Email</span>
                        <span className="listing-meta-value">{post.owner?.email}</span>
                      </div>

                      <div className="listing-meta-item">
                        <span className="listing-meta-label">User ID</span>
                        <span className="listing-meta-value">
                          {post.owner?.publicId || "No ID yet"}
                        </span>
                      </div>
                    </div>

                    {!user ? (
                      <div className="listing-guidance-box">
                        Sign in to send a skill exchange request.
                      </div>
                    ) : isOwnPost ? (
                      <div className="listing-guidance-box">
                        This is your own exchange post.
                      </div>
                    ) : (
                      <div className="listing-action-row">
                        <button
                          onClick={() => handleSendRequest(post._id)}
                          disabled={alreadyRequested || isLoading || post.status !== "open"}
                          className={alreadyRequested ? "secondary" : ""}
                        >
                          {isLoading
                            ? "Sending..."
                            : alreadyRequested
                            ? "Requested"
                            : post.status !== "open"
                            ? "Unavailable"
                            : "Propose Exchange"}
                        </button>

                        <div className="listing-action-hint">
                          {alreadyRequested
                            ? "You already sent a request for this post."
                            : "Send a request to exchange skills with this user."}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "create" && user && (
        <div className="card">
          <h2 className="card-title">Create Skill Exchange Post</h2>

          <form className="form-grid" onSubmit={handleCreatePost}>
            <input
              type="text"
              name="offerSkill"
              placeholder="Skill you can offer"
              value={formData.offerSkill}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="wantSkill"
              placeholder="Skill you want to learn"
              value={formData.wantSkill}
              onChange={handleChange}
              required
            />

            <textarea
              name="offerDescription"
              placeholder="Describe what you can teach"
              value={formData.offerDescription}
              onChange={handleChange}
            />

            <textarea
              name="wantDescription"
              placeholder="Describe what you want to learn"
              value={formData.wantDescription}
              onChange={handleChange}
            />

            <select
              name="offerLevel"
              value={formData.offerLevel}
              onChange={handleChange}
            >
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>

            <select
              name="wantedLevel"
              value={formData.wantedLevel}
              onChange={handleChange}
            >
              <option value="any">any</option>
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>

            <select name="mode" value={formData.mode} onChange={handleChange}>
              <option value="online">online</option>
              <option value="offline">offline</option>
              <option value="both">both</option>
            </select>

            <div className="actions">
              <button type="submit">Create Exchange Post</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "received" && user && (
        <div className="requests-list">
          {receivedRequests.length === 0 ? (
            <div className="empty-state request-empty">No received exchange requests yet.</div>
          ) : (
            receivedRequests.map((request) => {
              const isProcessing = processingRequestId === request._id;
              const sessionForm = exchangeSessionForms[request._id] || {};
              const isSessionFormOpen = Boolean(sessionForm.open);

              return (
                <div key={request._id} className="card request-card">
                  <div className="request-card-header">
                    <div>
                      <h2 className="request-card-title">
                        {request.exchange?.offerSkill || "Skill Exchange"}
                      </h2>
                      <p className="request-card-subtitle">
                        Wants: {request.exchange?.wantSkill || "N/A"}
                      </p>
                    </div>

                    <div className="request-card-badges">
                      <span className="badge badge-blue">Received</span>
                      <span className={getStatusBadgeClass(request.status)}>
                        {request.status}
                      </span>
                    </div>
                  </div>

                  <div className="request-content-grid">
                    <div className="request-panel">
                      <div className="request-panel-title">Message</div>
                      <div className="request-message-box">
                        {request.message || "No message provided."}
                      </div>
                    </div>

                    <div className="request-panel">
                      <div className="request-panel-title">Requester</div>

                      <div className="request-meta-list">
                        <div className="request-meta-row">
                          <span className="label">Name</span>
                          <span>{request.sender?.name || "N/A"}</span>
                        </div>

                        <div className="request-meta-row">
                          <span className="label">Email</span>
                          <span>{request.sender?.email || "N/A"}</span>
                        </div>

                        <div className="request-meta-row">
                          <span className="label">User ID</span>
                          <span>{request.sender?.publicId || "No ID yet"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="request-action-buttons">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleAccept(request._id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleReject(request._id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  )}

                  {request.status === "accepted" && (
                    <>
                      <div className="request-action-buttons">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleOpenExchangeChat(request._id)}
                        >
                          Open Chat
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
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
                      </div>

                      {isSessionFormOpen && (
                        <div className="review-card session-panel" style={{ marginTop: "16px" }}>
                          <h3 className="session-panel-title">Create Exchange Session</h3>

                          <div className="form-grid">
                            <input
                              type="datetime-local"
                              value={sessionForm.startTime || ""}
                              onChange={(e) =>
                                handleExchangeSessionFieldChange(
                                  request._id,
                                  "startTime",
                                  e.target.value
                                )
                              }
                            />

                            <input
                              type="datetime-local"
                              value={sessionForm.endTime || ""}
                              onChange={(e) =>
                                handleExchangeSessionFieldChange(
                                  request._id,
                                  "endTime",
                                  e.target.value
                                )
                              }
                            />

                            <select
                              value={sessionForm.deliveryMode || "online"}
                              onChange={(e) =>
                                handleExchangeSessionFieldChange(
                                  request._id,
                                  "deliveryMode",
                                  e.target.value
                                )
                              }
                            >
                              <option value="online">Online</option>
                              <option value="offline">Offline</option>
                            </select>

                            {(sessionForm.deliveryMode || "online") === "online" ? (
                              <input
                                type="text"
                                placeholder="Google Meet link"
                                value={sessionForm.roomUrl || ""}
                                onChange={(e) =>
                                  handleExchangeSessionFieldChange(
                                    request._id,
                                    "roomUrl",
                                    e.target.value
                                  )
                                }
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter session location"
                                value={sessionForm.location || ""}
                                onChange={(e) =>
                                  handleExchangeSessionFieldChange(
                                    request._id,
                                    "location",
                                    e.target.value
                                  )
                                }
                              />
                            )}

                            <div className="session-actions session-actions-primary">
                              <button onClick={() => handleCreateExchangeSession(request._id)}>
                                Save Exchange Session
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "sent" && user && (
        <div className="requests-list">
          {sentRequests.length === 0 ? (
            <div className="empty-state request-empty">No sent exchange requests yet.</div>
          ) : (
            sentRequests.map((request) => (
              <div key={request._id} className="card request-card">
                <div className="request-card-header">
                  <div>
                    <h2 className="request-card-title">
                      {request.exchange?.offerSkill || "Skill Exchange"}
                    </h2>
                    <p className="request-card-subtitle">
                      Wants: {request.exchange?.wantSkill || "N/A"}
                    </p>
                  </div>

                  <div className="request-card-badges">
                    <span className="badge badge-blue">Sent</span>
                    <span className={getStatusBadgeClass(request.status)}>
                      {request.status}
                    </span>
                  </div>
                </div>

                <div className="request-content-grid">
                  <div className="request-panel">
                    <div className="request-panel-title">Message</div>
                    <div className="request-message-box">
                      {request.message || "No message provided."}
                    </div>
                  </div>

                  <div className="request-panel">
                    <div className="request-panel-title">Receiver</div>

                    <div className="request-meta-list">
                      <div className="request-meta-row">
                        <span className="label">Name</span>
                        <span>{request.receiver?.name || "N/A"}</span>
                      </div>

                      <div className="request-meta-row">
                        <span className="label">Email</span>
                        <span>{request.receiver?.email || "N/A"}</span>
                      </div>

                      <div className="request-meta-row">
                        <span className="label">User ID</span>
                        <span>{request.receiver?.publicId || "No ID yet"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {request.status === "accepted" && (
                  <div className="request-action-buttons">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenExchangeChat(request._id)}
                    >
                      Open Chat
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SkillExchange;