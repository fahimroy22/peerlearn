import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import useAuth from "../context/useAuth";

function Chats() {
  const { user } = useAuth();

  const [sessionChats, setSessionChats] = useState([]);
  const [requestChats, setRequestChats] = useState([]);
  const [exchangeChats, setExchangeChats] = useState([]);

  const [sessionUnreadCounts, setSessionUnreadCounts] = useState({});
  const [requestUnreadCounts, setRequestUnreadCounts] = useState({});
  const [exchangeUnreadCounts, setExchangeUnreadCounts] = useState({});

  const [sessionLastMessages, setSessionLastMessages] = useState({});
  const [requestLastMessages, setRequestLastMessages] = useState({});
  const [exchangeLastMessages, setExchangeLastMessages] = useState({});

  const [activeTab, setActiveTab] = useState("sessions");
  const [searchTerm, setSearchTerm] = useState("");

  const getUnreadCount = (messages = []) => {
    return messages.filter((message) => {
      const isOwnMessage = String(message.sender?._id) === String(user?._id);
      if (isOwnMessage) return false;

      const readBy = Array.isArray(message.readBy) ? message.readBy : [];
      const isReadByCurrentUser = readBy.some(
        (readerId) => String(readerId) === String(user?._id)
      );

      return !isReadByCurrentUser;
    }).length;
  };

  const getLastMessage = (messages = []) => {
    if (!messages.length) return null;
    return messages[messages.length - 1];
  };

  const formatLastMessagePreview = (message) => {
    if (!message) return "No messages yet";

    const text = message.text?.trim();
    if (text) return text;

    if (message.attachment?.fileType === "image") return "📷 Photo";
    if (message.attachment?.fileType === "document") return "📄 Document";
    if (message.attachment) return "📎 Attachment";

    return "No messages yet";
  };

  const formatChatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();

    const isSameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isSameDay) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const fetchChats = async () => {
    try {
      const [
        sessionsRes,
        requestsRes,
        incomingRequestsRes,
        exchangeConversationsRes,
      ] = await Promise.all([
        api.get("/sessions/my-sessions"),
        api.get("/requests/my-sent"),
        api.get("/requests/my-received"),
        api.get("/exchange-conversations"),
      ]);

      const sessions = sessionsRes.data || [];
      const requests = [...(requestsRes.data || []), ...(incomingRequestsRes.data || [])];
      const exchangeConversations = exchangeConversationsRes.data || [];

      setSessionChats(sessions);
      setRequestChats(requests);
      setExchangeChats(exchangeConversations);

      const sessionUnreadMap = {};
      const sessionLastMessageMap = {};

      await Promise.all(
        sessions.map(async (session) => {
          try {
            const res = await api.get(`/messages/${session._id}`);
            const messages = res.data || [];
            sessionUnreadMap[session._id] = getUnreadCount(messages);
            sessionLastMessageMap[session._id] = getLastMessage(messages);
          } catch (error) {
            console.error("Failed to load session chat data", error);
            sessionUnreadMap[session._id] = 0;
            sessionLastMessageMap[session._id] = null;
          }
        })
      );

      setSessionUnreadCounts(sessionUnreadMap);
      setSessionLastMessages(sessionLastMessageMap);

      const uniqueRequests = [];
      const seen = new Set();

      requests.forEach((req) => {
        if (!seen.has(req._id)) {
          seen.add(req._id);
          uniqueRequests.push(req);
        }
      });

      const requestUnreadMap = {};
      const requestLastMessageMap = {};

      await Promise.all(
        uniqueRequests.map(async (req) => {
          try {
            const res = await api.get(`/request-messages/${req._id}`);
            const messages = res.data || [];
            requestUnreadMap[req._id] = getUnreadCount(messages);
            requestLastMessageMap[req._id] = getLastMessage(messages);
          } catch (error) {
            console.error("Failed to load request chat data", error);
            requestUnreadMap[req._id] = 0;
            requestLastMessageMap[req._id] = null;
          }
        })
      );

      setRequestUnreadCounts(requestUnreadMap);
      setRequestLastMessages(requestLastMessageMap);

      const exchangeUnreadMap = {};
      const exchangeLastMessageMap = {};

      await Promise.all(
        exchangeConversations.map(async (conversation) => {
          try {
            const res = await api.get(`/exchange-messages/${conversation._id}`);
            const messages = res.data || [];
            exchangeUnreadMap[conversation._id] = getUnreadCount(messages);
            exchangeLastMessageMap[conversation._id] = getLastMessage(messages);
          } catch (error) {
            console.error("Failed to load exchange chat data", error);
            exchangeUnreadMap[conversation._id] = 0;
            exchangeLastMessageMap[conversation._id] = null;
          }
        })
      );

      setExchangeUnreadCounts(exchangeUnreadMap);
      setExchangeLastMessages(exchangeLastMessageMap);
    } catch (error) {
      console.error("Failed to load chats", error);
    }
  };

  useEffect(() => {
    fetchChats();

    const handleRefresh = () => {
      fetchChats();
    };

    socket.on("new_session_message", handleRefresh);
    socket.on("new_request_message", handleRefresh);
    socket.on("new_exchange_message", handleRefresh);
    socket.on("unread-updated", handleRefresh);

    return () => {
      socket.off("new_session_message", handleRefresh);
      socket.off("new_request_message", handleRefresh);
      socket.off("new_exchange_message", handleRefresh);
      socket.off("unread-updated", handleRefresh);
    };
  }, [user?._id]);

  const uniqueRequestChats = useMemo(() => {
    const map = new Map();
    requestChats.forEach((req) => {
      if (!map.has(req._id)) {
        map.set(req._id, req);
      }
    });
    return Array.from(map.values());
  }, [requestChats]);

  const sortedSessionChats = useMemo(() => {
    return [...sessionChats].sort((a, b) => {
      const aLast = sessionLastMessages[a._id]?.createdAt || a.updatedAt || a.createdAt || 0;
      const bLast = sessionLastMessages[b._id]?.createdAt || b.updatedAt || b.createdAt || 0;
      return new Date(bLast) - new Date(aLast);
    });
  }, [sessionChats, sessionLastMessages]);

  const sortedRequestChats = useMemo(() => {
    return [...uniqueRequestChats].sort((a, b) => {
      const aLast = requestLastMessages[a._id]?.createdAt || a.updatedAt || a.createdAt || 0;
      const bLast = requestLastMessages[b._id]?.createdAt || b.updatedAt || b.createdAt || 0;
      return new Date(bLast) - new Date(aLast);
    });
  }, [uniqueRequestChats, requestLastMessages]);

  const sortedExchangeChats = useMemo(() => {
    return [...exchangeChats].sort((a, b) => {
      const aLast = exchangeLastMessages[a._id]?.createdAt || a.updatedAt || a.createdAt || 0;
      const bLast = exchangeLastMessages[b._id]?.createdAt || b.updatedAt || b.createdAt || 0;
      return new Date(bLast) - new Date(aLast);
    });
  }, [exchangeChats, exchangeLastMessages]);

  const totalUnreadSessions = Object.values(sessionUnreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalUnreadRequests = Object.values(requestUnreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalUnreadExchanges = Object.values(exchangeUnreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalUnread = totalUnreadSessions + totalUnreadRequests + totalUnreadExchanges;

  const filteredSessionChats = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedSessionChats;

    return sortedSessionChats.filter((session) => {
      const otherPerson =
        user?._id === session.tutor?._id ? session.learner : session.tutor;

      const lastMessage = sessionLastMessages[session._id];
      const searchableText = [
        otherPerson?.name,
        otherPerson?.email,
        otherPerson?.publicId,
        session.request?.listing?.skillName,
        formatLastMessagePreview(lastMessage),
        "session",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [sortedSessionChats, searchTerm, user?._id, sessionLastMessages]);

  const filteredRequestChats = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedRequestChats;

    return sortedRequestChats.filter((req) => {
      const otherPerson =
        user?._id === req.tutor?._id ? req.learner : req.tutor;

      const lastMessage = requestLastMessages[req._id];
      const searchableText = [
        otherPerson?.name,
        otherPerson?.email,
        otherPerson?.publicId,
        req.listing?.skillName,
        formatLastMessagePreview(lastMessage),
        "request",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [sortedRequestChats, searchTerm, user?._id, requestLastMessages]);

  const filteredExchangeChats = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedExchangeChats;

    return sortedExchangeChats.filter((conversation) => {
      const otherPerson =
        String(user?._id) === String(conversation.userOne?._id)
          ? conversation.userTwo
          : conversation.userOne;

      const lastMessage = exchangeLastMessages[conversation._id];
      const searchableText = [
        otherPerson?.name,
        otherPerson?.email,
        otherPerson?.publicId,
        conversation.exchange?.offerSkill,
        conversation.exchange?.wantSkill,
        formatLastMessagePreview(lastMessage),
        "exchange",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [sortedExchangeChats, searchTerm, user?._id, exchangeLastMessages]);

  const activeChatCount =
    activeTab === "sessions"
      ? filteredSessionChats.length
      : activeTab === "requests"
      ? filteredRequestChats.length
      : filteredExchangeChats.length;

  const ChatTypeIcon = ({ type }) => {
    if (type === "request") {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 8H17M7 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "exchange") {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M16.5 9.5L7.5 14.5M7.5 9.5L16.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.01 20.94L3.78 17.27C2.79 16.64 2 15.21 2 14.05V9.94C2 8.78 2.79 7.35 3.78 6.72L9.01 3.05C9.98 2.43 11.5 2.43 12.47 3.05L17.7 6.72C18.69 7.35 19.48 8.78 19.48 9.94V14.05C19.48 15.21 18.69 16.64 17.7 17.27L12.47 20.94C11.5 21.57 9.98 21.57 9.01 20.94Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const ChatPreviewCard = ({
    to,
    type,
    typeLabel,
    avatarText,
    name,
    meta,
    preview,
    time,
    unreadCount,
  }) => {
    return (
      <Link to={to} className="chat-preview-link">
        <article
          className={`chat-preview-card-modern ${
            unreadCount > 0 ? "chat-preview-card-unread" : ""
          }`}
        >
          <div className="chat-card-glow"></div>

          <div className="chat-preview-avatar-modern">
            {avatarText || "U"}
          </div>

          <div className="chat-preview-content-modern">
            <div className="chat-preview-header-modern">
              <div className="chat-preview-title-wrap">
                <h3 className="chat-preview-name-modern">{name || "Unknown user"}</h3>
                <span className="chat-preview-type-badge">
                  <ChatTypeIcon type={type} />
                  {typeLabel}
                </span>
              </div>

              <div className={`chat-preview-time-modern ${unreadCount > 0 ? "has-unread" : ""}`}>
                {time}
              </div>
            </div>

            <div className="chat-preview-meta-modern">
              <span className="chat-preview-meta-text">{meta}</span>
            </div>

            <div className="chat-preview-footer-modern">
              <div className="chat-preview-last-modern">{preview}</div>

              {unreadCount > 0 ? (
                <span className="chat-unread-pill-modern">{unreadCount}</span>
              ) : (
                <span className="chat-read-pill-modern">Read</span>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  };

  return (
    <div className="page chats-page">
      <div className="chats-hero">
        <div className="chats-hero-content">
          <div className="chats-hero-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 8H17M7 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="chats-hero-title">Chats</h1>
          <p className="chats-hero-subtitle">
            Open conversations fast, track unread replies, and continue where you left off.
          </p>
        </div>

        <div className="chats-stats">
          <div className="chat-stat-card chat-stat-primary">
            <div className="chat-stat-icon">
              <ChatTypeIcon type="session" />
            </div>
            <div className="chat-stat-content">
              <div className="chat-stat-value">{sortedSessionChats.length}</div>
              <div className="chat-stat-label">Session Chats</div>
            </div>
          </div>

          <div className="chat-stat-card chat-stat-info">
            <div className="chat-stat-icon">
              <ChatTypeIcon type="request" />
            </div>
            <div className="chat-stat-content">
              <div className="chat-stat-value">{sortedRequestChats.length}</div>
              <div className="chat-stat-label">Request Chats</div>
            </div>
          </div>

          <div className="chat-stat-card chat-stat-success">
            <div className="chat-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12H15M15 12L12 9M15 12L12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="chat-stat-content">
              <div className="chat-stat-value">{totalUnread}</div>
              <div className="chat-stat-label">Unread Messages</div>
            </div>
          </div>
        </div>
      </div>

      <div className="chats-controls">
        <div className="chats-tabs">
          <button
            className={`chats-tab ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            <span className="chats-tab-icon">
              <ChatTypeIcon type="session" />
            </span>
            <span className="chats-tab-label">Session Chats</span>
            {totalUnreadSessions > 0 && (
              <span className="chats-tab-count">{totalUnreadSessions}</span>
            )}
          </button>

          <button
            className={`chats-tab ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <span className="chats-tab-icon">
              <ChatTypeIcon type="request" />
            </span>
            <span className="chats-tab-label">Request Chats</span>
            {totalUnreadRequests > 0 && (
              <span className="chats-tab-count">{totalUnreadRequests}</span>
            )}
          </button>

          <button
            className={`chats-tab ${activeTab === "exchanges" ? "active" : ""}`}
            onClick={() => setActiveTab("exchanges")}
          >
            <span className="chats-tab-icon">
              <ChatTypeIcon type="exchange" />
            </span>
            <span className="chats-tab-label">Exchange Chats</span>
            {totalUnreadExchanges > 0 && (
              <span className="chats-tab-count">{totalUnreadExchanges}</span>
            )}
          </button>
        </div>

        <div className="chats-search-box-modern">
          <span className="chats-search-icon-modern">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          <input
            type="text"
            placeholder="Search by name, email, ID, skill, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="chats-search-input-modern"
          />

          {searchTerm && (
            <button
              type="button"
              className="chats-search-clear-modern"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="chat-section-heading">
        <div>
          <h2 className="chat-section-title">
            {activeTab === "sessions"
              ? "Session Conversations"
              : activeTab === "requests"
              ? "Request Conversations"
              : "Exchange Conversations"}
          </h2>
          <p className="chat-section-subtitle">
            {activeChatCount} conversation{activeChatCount === 1 ? "" : "s"} in this view
          </p>
        </div>
      </div>

      {activeTab === "sessions" && (
        <>
          {filteredSessionChats.length === 0 ? (
            <div className="chats-empty">
              <div className="chats-empty-icon">
                <ChatTypeIcon type="session" />
              </div>
              <h3 className="chats-empty-title">No session chats found</h3>
              <p className="chats-empty-text">
                {searchTerm ? "No session chats matched your search." : "No session chats yet."}
              </p>
            </div>
          ) : (
            <div className="chat-list-modern">
              {filteredSessionChats.map((session) => {
                const otherPerson =
                  user?._id === session.tutor?._id ? session.learner : session.tutor;

                const unreadCount = sessionUnreadCounts[session._id] || 0;
                const lastMessage = sessionLastMessages[session._id];
                const lastPreview = formatLastMessagePreview(lastMessage);
                const lastTime = formatChatTime(lastMessage?.createdAt);

                return (
                  <ChatPreviewCard
                    key={session._id}
                    to={`/chat/${session._id}`}
                    type="session"
                    typeLabel="Session"
                    avatarText={otherPerson?.name?.charAt(0)?.toUpperCase()}
                    name={otherPerson?.name || "Unknown user"}
                    meta={otherPerson?.email || "No email"}
                    preview={lastPreview}
                    time={lastTime}
                    unreadCount={unreadCount}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "requests" && (
        <>
          {filteredRequestChats.length === 0 ? (
            <div className="chats-empty">
              <div className="chats-empty-icon">
                <ChatTypeIcon type="request" />
              </div>
              <h3 className="chats-empty-title">No request chats found</h3>
              <p className="chats-empty-text">
                {searchTerm ? "No request chats matched your search." : "No request chats yet."}
              </p>
            </div>
          ) : (
            <div className="chat-list-modern">
              {filteredRequestChats.map((req) => {
                const otherPerson =
                  user?._id === req.tutor?._id ? req.learner : req.tutor;

                const unreadCount = requestUnreadCounts[req._id] || 0;
                const lastMessage = requestLastMessages[req._id];
                const lastPreview = formatLastMessagePreview(lastMessage);
                const lastTime = formatChatTime(lastMessage?.createdAt);

                return (
                  <ChatPreviewCard
                    key={req._id}
                    to={`/request-chat/${req._id}`}
                    type="request"
                    typeLabel="Request"
                    avatarText={otherPerson?.name?.charAt(0)?.toUpperCase()}
                    name={otherPerson?.name || "Unknown user"}
                    meta={otherPerson?.email || "No email"}
                    preview={lastPreview}
                    time={lastTime}
                    unreadCount={unreadCount}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "exchanges" && (
        <>
          {filteredExchangeChats.length === 0 ? (
            <div className="chats-empty">
              <div className="chats-empty-icon">
                <ChatTypeIcon type="exchange" />
              </div>
              <h3 className="chats-empty-title">No exchange chats found</h3>
              <p className="chats-empty-text">
                {searchTerm ? "No exchange chats matched your search." : "No exchange chats yet."}
              </p>
            </div>
          ) : (
            <div className="chat-list-modern">
              {filteredExchangeChats.map((conversation) => {
                const otherPerson =
                  String(user?._id) === String(conversation.userOne?._id)
                    ? conversation.userTwo
                    : conversation.userOne;

                const unreadCount = exchangeUnreadCounts[conversation._id] || 0;
                const lastMessage = exchangeLastMessages[conversation._id];
                const lastPreview = formatLastMessagePreview(lastMessage);
                const lastTime = formatChatTime(lastMessage?.createdAt);

                return (
                  <ChatPreviewCard
                    key={conversation._id}
                    to={`/exchange-chat/${conversation._id}`}
                    type="exchange"
                    typeLabel="Exchange"
                    avatarText={otherPerson?.name?.charAt(0)?.toUpperCase()}
                    name={otherPerson?.name || "Unknown user"}
                    meta={`${conversation.exchange?.offerSkill || "Skill"} ↔ ${
                      conversation.exchange?.wantSkill || "Skill"
                    }`}
                    preview={lastPreview}
                    time={lastTime}
                    unreadCount={unreadCount}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Chats;
