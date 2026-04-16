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

  return (
    <div className="page">
      <div className="chats-page-header">
        <div>
          <div className="section-eyebrow">Conversation Hub</div>
          <h1 className="page-title">Chats</h1>
          <p className="chats-page-subtitle">
            Open conversations fast, track unread replies, and continue where you left off.
          </p>
        </div>
      </div>

      <div className="chats-summary-strip">
        <div className="chats-summary-card">
          <span className="chats-summary-label">Session Chats</span>
          <strong className="chats-summary-value">{sortedSessionChats.length}</strong>
        </div>

        <div className="chats-summary-card">
          <span className="chats-summary-label">Request Chats</span>
          <strong className="chats-summary-value">{sortedRequestChats.length}</strong>
        </div>

        <div className="chats-summary-card">
          <span className="chats-summary-label">Exchange Chats</span>
          <strong className="chats-summary-value">{sortedExchangeChats.length}</strong>
        </div>

        <div className="chats-summary-card chats-summary-card-accent">
          <span className="chats-summary-label">Unread Messages</span>
          <strong className="chats-summary-value">
            {totalUnreadSessions + totalUnreadRequests + totalUnreadExchanges}
          </strong>
        </div>
      </div>

      <div className="chats-search-wrap">
        <div className="chats-search-box">
          <span className="chats-search-icon">🔎</span>
          <input
            type="text"
            placeholder="Search by name, email, ID, skill, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="chats-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="chats-search-clear"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Session Chats
          {totalUnreadSessions > 0 && (
            <span className="chats-tab-count">{totalUnreadSessions}</span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          Request Chats
          {totalUnreadRequests > 0 && (
            <span className="chats-tab-count">{totalUnreadRequests}</span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === "exchanges" ? "active" : ""}`}
          onClick={() => setActiveTab("exchanges")}
        >
          Exchange Chats
          {totalUnreadExchanges > 0 && (
            <span className="chats-tab-count">{totalUnreadExchanges}</span>
          )}
        </button>
      </div>

      {activeTab === "sessions" && (
        <div>
          <h2 className="section-title">Session Conversations</h2>

          {filteredSessionChats.length === 0 ? (
            <div className="empty-state chat-empty-state">
              {searchTerm ? "No session chats matched your search" : "No session chats yet"}
            </div>
          ) : (
            <div className="chat-list chat-list-whatsapp">
              {filteredSessionChats.map((session) => {
                const otherPerson =
                  user?._id === session.tutor?._id ? session.learner : session.tutor;

                const unreadCount = sessionUnreadCounts[session._id] || 0;
                const lastMessage = sessionLastMessages[session._id];
                const lastPreview = formatLastMessagePreview(lastMessage);
                const lastTime = formatChatTime(lastMessage?.createdAt);

                return (
                  <Link
                    key={session._id}
                    to={`/chat/${session._id}`}
                    className="chat-preview-link"
                  >
                    <div
                      className={`chat-preview-card chat-preview-card-wa ${
                        unreadCount > 0 ? "chat-preview-card-unread" : ""
                      }`}
                    >
                      <div className="chat-preview-avatar chat-preview-avatar-wa">
                        {otherPerson?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="chat-preview-content-wa">
                        <div className="chat-preview-top-wa">
                          <div className="chat-preview-name-wrap">
                            <h3 className="chat-preview-name">
                              {otherPerson?.name || "Unknown user"}
                            </h3>
                            <span className="chat-preview-type">Session</span>
                          </div>

                          <div
                            className={`chat-preview-time-wa ${
                              unreadCount > 0 ? "has-unread" : ""
                            }`}
                          >
                            {lastTime}
                          </div>
                        </div>

                        <div className="chat-preview-bottom-wa">
                          <div className="chat-preview-message-wa">
                            <span className="chat-preview-email-wa">
                              {otherPerson?.email || "No email"}
                            </span>
                            <span className="chat-preview-dot">•</span>
                            <span className="chat-preview-last">{lastPreview}</span>
                          </div>

                          {unreadCount > 0 ? (
                            <span className="chat-unread-pill">{unreadCount}</span>
                          ) : (
                            <span className="chat-read-pill">Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div>
          <h2 className="section-title">Request Conversations</h2>

          {filteredRequestChats.length === 0 ? (
            <div className="empty-state chat-empty-state">
              {searchTerm ? "No request chats matched your search" : "No request chats yet"}
            </div>
          ) : (
            <div className="chat-list chat-list-whatsapp">
              {filteredRequestChats.map((req) => {
                const otherPerson =
                  user?._id === req.tutor?._id ? req.learner : req.tutor;

                const unreadCount = requestUnreadCounts[req._id] || 0;
                const lastMessage = requestLastMessages[req._id];
                const lastPreview = formatLastMessagePreview(lastMessage);
                const lastTime = formatChatTime(lastMessage?.createdAt);

                return (
                  <Link
                    key={req._id}
                    to={`/request-chat/${req._id}`}
                    className="chat-preview-link"
                  >
                    <div
                      className={`chat-preview-card chat-preview-card-wa ${
                        unreadCount > 0 ? "chat-preview-card-unread" : ""
                      }`}
                    >
                      <div className="chat-preview-avatar chat-preview-avatar-wa">
                        {otherPerson?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="chat-preview-content-wa">
                        <div className="chat-preview-top-wa">
                          <div className="chat-preview-name-wrap">
                            <h3 className="chat-preview-name">
                              {otherPerson?.name || "Unknown user"}
                            </h3>
                            <span className="chat-preview-type">Request</span>
                          </div>

                          <div
                            className={`chat-preview-time-wa ${
                              unreadCount > 0 ? "has-unread" : ""
                            }`}
                          >
                            {lastTime}
                          </div>
                        </div>

                        <div className="chat-preview-bottom-wa">
                          <div className="chat-preview-message-wa">
                            <span className="chat-preview-email-wa">
                              {otherPerson?.email || "No email"}
                            </span>
                            <span className="chat-preview-dot">•</span>
                            <span className="chat-preview-last">{lastPreview}</span>
                          </div>

                          {unreadCount > 0 ? (
                            <span className="chat-unread-pill">{unreadCount}</span>
                          ) : (
                            <span className="chat-read-pill">Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "exchanges" && (
        <div>
          <h2 className="section-title">Exchange Conversations</h2>

          {filteredExchangeChats.length === 0 ? (
            <div className="empty-state chat-empty-state">
              {searchTerm ? "No exchange chats matched your search" : "No exchange chats yet"}
            </div>
          ) : (
            <div className="chat-list chat-list-whatsapp">
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
                  <Link
                    key={conversation._id}
                    to={`/exchange-chat/${conversation._id}`}
                    className="chat-preview-link"
                  >
                    <div
                      className={`chat-preview-card chat-preview-card-wa ${
                        unreadCount > 0 ? "chat-preview-card-unread" : ""
                      }`}
                    >
                      <div className="chat-preview-avatar chat-preview-avatar-wa">
                        {otherPerson?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="chat-preview-content-wa">
                        <div className="chat-preview-top-wa">
                          <div className="chat-preview-name-wrap">
                            <h3 className="chat-preview-name">
                              {otherPerson?.name || "Unknown user"}
                            </h3>
                            <span className="chat-preview-type">Exchange</span>
                          </div>

                          <div
                            className={`chat-preview-time-wa ${
                              unreadCount > 0 ? "has-unread" : ""
                            }`}
                          >
                            {lastTime}
                          </div>
                        </div>

                        <div className="chat-preview-bottom-wa">
                          <div className="chat-preview-message-wa">
                            <span className="chat-preview-email-wa">
                              {conversation.exchange?.offerSkill || "Skill"}
                            </span>
                            <span className="chat-preview-dot">↔</span>
                            <span className="chat-preview-email-wa">
                              {conversation.exchange?.wantSkill || "Skill"}
                            </span>
                            <span className="chat-preview-dot">•</span>
                            <span className="chat-preview-last">{lastPreview}</span>
                          </div>

                          {unreadCount > 0 ? (
                            <span className="chat-unread-pill">{unreadCount}</span>
                          ) : (
                            <span className="chat-read-pill">Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Chats;