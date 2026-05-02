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

  useEffect(() => { fetchSkillExchangeData(); }, [user]);

  const sentExchangeIds = useMemo(() => {
    return new Set((sentRequests || []).map((req) => req.exchange?._id).filter(Boolean));
  }, [sentRequests]);

  const filteredPosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) => {
      const searchableText = [
        post.offerSkill, post.wantSkill, post.offerDescription, post.wantDescription,
        post.offerLevel, post.wantedLevel, post.mode, post.status,
        post.owner?.name, post.owner?.email, post.owner?.publicId,
      ].filter(Boolean).join(" ").toLowerCase();
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
        offerSkill: "", wantSkill: "", offerDescription: "", wantDescription: "",
        offerLevel: "beginner", wantedLevel: "any", mode: "online",
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
        ...(field === "deliveryMode" && value === "online"  ? { location: "" } : {}),
        ...(field === "deliveryMode" && value === "offline" ? { roomUrl: "" }  : {}),
      },
    }));
  };

  const handleCreateExchangeSession = async (requestId) => {
    try {
      const form = exchangeSessionForms[requestId] || {};
      if (!form.startTime || !form.endTime) {
        showToast("Please enter start time and end time", "error"); return;
      }
      if (form.deliveryMode === "offline") {
        if (!String(form.location || "").trim()) {
          showToast("Please enter a location for the offline session", "error"); return;
        }
      } else {
        if (!String(form.roomUrl || "").trim()) {
          showToast("Please enter a Google Meet link", "error"); return;
        }
        if (!String(form.roomUrl || "").includes("meet.google.com")) {
          showToast("Please enter a valid Google Meet link", "error"); return;
        }
      }
      await api.post("/sessions/exchange", {
        exchangeRequestId: requestId,
        startTime: form.startTime,
        endTime: form.endTime,
        deliveryMode: form.deliveryMode || "online",
        roomUrl:   (form.deliveryMode || "online") === "online"  ? form.roomUrl  : "",
        location:  (form.deliveryMode || "online") === "offline" ? form.location : "",
      });
      showToast("Exchange session created successfully", "success");
      setExchangeSessionForms((prev) => ({
        ...prev,
        [requestId]: { ...prev[requestId], open: false, startTime: "", endTime: "", deliveryMode: "online", roomUrl: "", location: "" },
      }));
      navigate("/sessions");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to create exchange session", "error");
    }
  };

  const getLevelTag = (level) => {
    if (level === "advanced")    return <span className="ls-tag ls-tag-blue">{level}</span>;
    if (level === "intermediate") return <span className="ls-tag ls-tag-amber">{level}</span>;
    if (level === "any")          return <span className="ls-tag ls-tag-gray">{level}</span>;
    return <span className="ls-tag ls-tag-green">{level}</span>;
  };

  const getStatusTag = (status) => {
    if (status === "open")     return <span className="ls-tag ls-tag-green">{status}</span>;
    if (status === "accepted" || status === "matched") return <span className="ls-tag ls-tag-blue">{status}</span>;
    if (status === "pending")  return <span className="ls-tag ls-tag-amber">{status}</span>;
    if (status === "rejected" || status === "closed")  return <span className="ls-tag ls-tag-red">{status}</span>;
    return <span className="ls-tag ls-tag-gray">{status}</span>;
  };

  const tabs = [
    { id: "browse",   label: "Browse" },
    ...(user ? [
      { id: "create",   label: "Create Post" },
      { id: "received", label: "Received" },
      { id: "sent",     label: "Sent" },
    ] : []),
  ];

  return (
    <div className="page ls-page">

      {/* PAGE HEADER */}
      <div className="ls-page-header">
        <div className="ls-page-header-left">
          <span className="ls-eyebrow">Peer-to-Peer Learning</span>
          <h1 className="ls-page-title">Skill Exchange</h1>
          <p className="ls-page-sub">
            Offer one skill, request another, and connect with peers for mutual learning.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="ls-tabs">
        {tabs.map((t) => (
          <button key={t.id}
            className={`ls-tab ${activeTab === t.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ BROWSE ══════════ */}
      {activeTab === "browse" && (
        <div>
          {/* Search */}
          <div className="ls-search-bar">
            <span className="ls-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input type="text"
              placeholder="Search by offered skill, wanted skill, user, email, ID, level…"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="ls-search-clear" onClick={() => setSearchTerm("")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          <div className="ls-results-meta">
            <span className="ls-results-count">
              <strong>{filteredPosts.length}</strong> of <strong>{posts.length}</strong> exchange posts
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              </div>
              <div className="ls-empty-title">No exchange posts found</div>
              <div className="ls-empty-sub">Try a different search term or create your own post.</div>
              {searchTerm && <button className="ls-btn-ghost ls-btn-sm" onClick={() => setSearchTerm("")}>Clear search</button>}
            </div>
          ) : (
            <div className="ls-grid">
              {filteredPosts.map((post, idx) => {
                const isOwnPost = String(user?._id) === String(post.owner?._id);
                const alreadyRequested = sentExchangeIds.has(post._id);
                const isLoading = loadingRequestId === post._id;

                return (
                  <div key={post._id} className="ls-card sx-card" style={{ "--card-i": idx }}>

                    {/* skill swap header */}
                    <div className="sx-card-top">
                      <div className="sx-swap-row">
                        <div className="sx-skill-block sx-offer-block">
                          <span className="sx-skill-dir">Offers</span>
                          <span className="sx-skill-name">{post.offerSkill}</span>
                          {getLevelTag(post.offerLevel)}
                        </div>
                        <div className="sx-swap-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                            <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                          </svg>
                        </div>
                        <div className="sx-skill-block sx-want-block">
                          <span className="sx-skill-dir">Wants</span>
                          <span className="sx-skill-name">{post.wantSkill}</span>
                          {getLevelTag(post.wantedLevel)}
                        </div>
                      </div>
                    </div>

                    {/* owner + status */}
                    <div className="ls-card-identity">
                      <div className="ls-tutor-left">
                        <div className="ls-avatar ls-avatar-init sx-avatar">
                          {post.owner?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="ls-tutor-info">
                          <span className="ls-tutor-name">{post.owner?.name}</span>
                          <span className="ls-tutor-pid">{post.owner?.publicId || "—"}</span>
                        </div>
                      </div>
                      <div className="sx-header-right">
                        <span className="ls-tag ls-tag-purple">{post.mode}</span>
                        {getStatusTag(post.status)}
                      </div>
                    </div>

                    {/* descriptions */}
                    <div className="ls-card-body sx-descs">
                      {post.offerDescription && (
                        <div className="sx-desc-block">
                          <span className="ls-stat-label">Offer</span>
                          <p className="ls-desc">{post.offerDescription}</p>
                        </div>
                      )}
                      {post.wantDescription && (
                        <div className="sx-desc-block">
                          <span className="ls-stat-label">Want</span>
                          <p className="ls-desc">{post.wantDescription}</p>
                        </div>
                      )}
                    </div>

                    {/* contact row */}
                    <div className="ls-learner-chip">
                      <span className="ls-learner-dot" />
                      <div className="ls-learner-info">
                        <span className="ls-learner-name">{post.owner?.email}</span>
                        <span className="ls-learner-meta">ID: {post.owner?.publicId || "—"}</span>
                      </div>
                    </div>

                    {/* action footer */}
                    <div className="ls-card-footer">
                      {!user ? (
                        <div className="ls-notice">Sign in to send an exchange request.</div>
                      ) : isOwnPost ? (
                        <div className="ls-notice sx-own-notice">This is your own exchange post.</div>
                      ) : (
                        <button
                          className={`ls-btn-request ${alreadyRequested ? "is-done" : ""} ${post.status !== "open" ? "is-unavailable" : ""}`}
                          onClick={() => handleSendRequest(post._id)}
                          disabled={alreadyRequested || isLoading || post.status !== "open"}
                        >
                          {isLoading ? (
                            <><span className="ls-spinner"/> Sending…</>
                          ) : alreadyRequested ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Requested
                            </>
                          ) : post.status !== "open" ? (
                            "Unavailable"
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                                <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                              </svg>
                              Propose Exchange
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ CREATE POST ══════════ */}
      {activeTab === "create" && user && (
        <div className="ls-create-card">
          <div className="ls-create-card-head">
            <h2 className="ls-card-title">Create Skill Exchange Post</h2>
            <p className="ls-card-sub">Tell others what you can teach and what you want to learn.</p>
          </div>
          <form className="ls-create-form" onSubmit={handleCreatePost}>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Skill you can offer</label>
                <input type="text" name="offerSkill" placeholder="e.g. Python, Guitar, Design…"
                  value={formData.offerSkill} onChange={handleChange} required />
              </div>
              <div className="ls-field">
                <label>Skill you want to learn</label>
                <input type="text" name="wantSkill" placeholder="e.g. React, Piano, Marketing…"
                  value={formData.wantSkill} onChange={handleChange} required />
              </div>
            </div>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Describe what you can teach</label>
                <textarea name="offerDescription" placeholder="Your experience, approach, topics you can cover…"
                  value={formData.offerDescription} onChange={handleChange} rows={3} />
              </div>
              <div className="ls-field">
                <label>Describe what you want to learn</label>
                <textarea name="wantDescription" placeholder="Your current level, goals, what you need help with…"
                  value={formData.wantDescription} onChange={handleChange} rows={3} />
              </div>
            </div>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Your offer level</label>
                <div className="ls-select-wrap">
                  <select name="offerLevel" value={formData.offerLevel} onChange={handleChange}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div className="ls-field">
                <label>Wanted level</label>
                <div className="ls-select-wrap">
                  <select name="wantedLevel" value={formData.wantedLevel} onChange={handleChange}>
                    <option value="any">Any</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div className="ls-field">
                <label>Mode</label>
                <div className="ls-select-wrap">
                  <select name="mode" value={formData.mode} onChange={handleChange}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="both">Both</option>
                  </select>
                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div className="ls-form-actions">
              <button type="submit" className="ls-btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Publish Exchange Post
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════ RECEIVED REQUESTS ══════════ */}
      {activeTab === "received" && user && (
        <div>
          {receivedRequests.length === 0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="ls-empty-title">No received requests yet</div>
              <div className="ls-empty-sub">When others request to exchange skills with you, they'll appear here.</div>
            </div>
          ) : (
            <div className="sx-requests-list">
              {receivedRequests.map((request) => {
                const isProcessing = processingRequestId === request._id;
                const sessionForm = exchangeSessionForms[request._id] || {};
                const isSessionFormOpen = Boolean(sessionForm.open);

                return (
                  <div key={request._id} className="sx-request-card">
                    {/* card header */}
                    <div className="sx-req-head">
                      <div className="sx-req-title-block">
                        <h3 className="sx-req-title">{request.exchange?.offerSkill || "Skill Exchange"}</h3>
                        <p className="sx-req-sub">Wants: <strong>{request.exchange?.wantSkill || "N/A"}</strong></p>
                      </div>
                      <div className="sx-req-badges">
                        <span className="ls-tag ls-tag-purple">Received</span>
                        {getStatusTag(request.status)}
                      </div>
                    </div>

                    {/* content grid */}
                    <div className="sx-req-grid">
                      <div className="sx-req-panel">
                        <div className="sx-req-panel-label">Message</div>
                        <div className="sx-req-message">{request.message || "No message provided."}</div>
                      </div>
                      <div className="sx-req-panel">
                        <div className="sx-req-panel-label">Requester</div>
                        <div className="sx-req-meta">
                          <div className="sx-req-meta-row">
                            <span className="sx-req-meta-key">Name</span>
                            <span className="sx-req-meta-val">{request.sender?.name || "N/A"}</span>
                          </div>
                          <div className="sx-req-meta-row">
                            <span className="sx-req-meta-key">Email</span>
                            <span className="sx-req-meta-val">{request.sender?.email || "N/A"}</span>
                          </div>
                          <div className="sx-req-meta-row">
                            <span className="sx-req-meta-key">User ID</span>
                            <span className="sx-req-meta-val">{request.sender?.publicId || "No ID yet"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* pending actions */}
                    {request.status === "pending" && (
                      <div className="sx-req-actions">
                        <button className="ls-btn-primary" onClick={() => handleAccept(request._id)} disabled={isProcessing}>
                          {isProcessing ? <><span className="ls-spinner"/> Processing…</> : <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Accept
                          </>}
                        </button>
                        <button className="ls-btn-danger" onClick={() => handleReject(request._id)} disabled={isProcessing}>
                          {isProcessing ? "Processing…" : "Reject"}
                        </button>
                      </div>
                    )}

                    {/* accepted actions */}
                    {request.status === "accepted" && (
                      <>
                        <div className="sx-req-actions">
                          <button className="ls-btn-primary" onClick={() => handleOpenExchangeChat(request._id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Open Chat
                          </button>
                          <button className="ls-btn-ghost"
                            onClick={() => setExchangeSessionForms((prev) => ({
                              ...prev,
                              [request._id]: {
                                ...prev[request._id], open: !prev[request._id]?.open,
                                startTime: prev[request._id]?.startTime || "",
                                endTime: prev[request._id]?.endTime || "",
                                deliveryMode: prev[request._id]?.deliveryMode || "online",
                                roomUrl: prev[request._id]?.roomUrl || "",
                                location: prev[request._id]?.location || "",
                              },
                            }))}>
                            {isSessionFormOpen ? "Close Session Form" : "Create Session"}
                          </button>
                        </div>

                        {/* session form */}
                        {isSessionFormOpen && (
                          <div className="sx-session-form">
                            <div className="sx-session-form-title">Create Exchange Session</div>
                            <div className="ls-form-row">
                              <div className="ls-field">
                                <label>Start Time</label>
                                <input type="datetime-local" value={sessionForm.startTime || ""}
                                  onChange={(e) => handleExchangeSessionFieldChange(request._id, "startTime", e.target.value)} />
                              </div>
                              <div className="ls-field">
                                <label>End Time</label>
                                <input type="datetime-local" value={sessionForm.endTime || ""}
                                  onChange={(e) => handleExchangeSessionFieldChange(request._id, "endTime", e.target.value)} />
                              </div>
                            </div>
                            <div className="ls-form-row">
                              <div className="ls-field">
                                <label>Mode</label>
                                <div className="ls-select-wrap">
                                  <select value={sessionForm.deliveryMode || "online"}
                                    onChange={(e) => handleExchangeSessionFieldChange(request._id, "deliveryMode", e.target.value)}>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                  </select>
                                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                              </div>
                              <div className="ls-field">
                                {(sessionForm.deliveryMode || "online") === "online" ? (
                                  <>
                                    <label>Google Meet Link</label>
                                    <input type="text" placeholder="https://meet.google.com/…"
                                      value={sessionForm.roomUrl || ""}
                                      onChange={(e) => handleExchangeSessionFieldChange(request._id, "roomUrl", e.target.value)} />
                                  </>
                                ) : (
                                  <>
                                    <label>Location</label>
                                    <input type="text" placeholder="Enter session location"
                                      value={sessionForm.location || ""}
                                      onChange={(e) => handleExchangeSessionFieldChange(request._id, "location", e.target.value)} />
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="ls-form-actions">
                              <button className="ls-btn-primary" onClick={() => handleCreateExchangeSession(request._id)}>
                                Save Exchange Session
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ SENT REQUESTS ══════════ */}
      {activeTab === "sent" && user && (
        <div>
          {sentRequests.length === 0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
                </svg>
              </div>
              <div className="ls-empty-title">No sent requests yet</div>
              <div className="ls-empty-sub">Browse exchanges and propose a skill swap.</div>
              <button className="ls-btn-primary ls-btn-sm" onClick={() => setActiveTab("browse")}>Browse Exchanges</button>
            </div>
          ) : (
            <div className="sx-requests-list">
              {sentRequests.map((request) => (
                <div key={request._id} className="sx-request-card">
                  <div className="sx-req-head">
                    <div className="sx-req-title-block">
                      <h3 className="sx-req-title">{request.exchange?.offerSkill || "Skill Exchange"}</h3>
                      <p className="sx-req-sub">Wants: <strong>{request.exchange?.wantSkill || "N/A"}</strong></p>
                    </div>
                    <div className="sx-req-badges">
                      <span className="ls-tag ls-tag-blue">Sent</span>
                      {getStatusTag(request.status)}
                    </div>
                  </div>

                  <div className="sx-req-grid">
                    <div className="sx-req-panel">
                      <div className="sx-req-panel-label">Message</div>
                      <div className="sx-req-message">{request.message || "No message provided."}</div>
                    </div>
                    <div className="sx-req-panel">
                      <div className="sx-req-panel-label">Receiver</div>
                      <div className="sx-req-meta">
                        <div className="sx-req-meta-row">
                          <span className="sx-req-meta-key">Name</span>
                          <span className="sx-req-meta-val">{request.receiver?.name || "N/A"}</span>
                        </div>
                        <div className="sx-req-meta-row">
                          <span className="sx-req-meta-key">Email</span>
                          <span className="sx-req-meta-val">{request.receiver?.email || "N/A"}</span>
                        </div>
                        <div className="sx-req-meta-row">
                          <span className="sx-req-meta-key">User ID</span>
                          <span className="sx-req-meta-val">{request.receiver?.publicId || "No ID yet"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {request.status === "accepted" && (
                    <div className="sx-req-actions">
                      <button className="ls-btn-primary" onClick={() => handleOpenExchangeChat(request._id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Open Chat
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SkillExchange;