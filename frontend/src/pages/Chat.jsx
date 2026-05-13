import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api, { API_BASE_URL } from "../api/axios";
import socket from "../socket";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function Chat() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [sessionDetails, setSessionDetails] = useState(null);

  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${sessionId}`);
      setMessages(res.data || []);
    } catch (error) {
      console.error("Failed to load session messages", error);
      showToast(
        error.response?.data?.message || "Failed to load messages",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await api.get("/sessions/my-sessions");
      const session = (res.data || []).find((s) => s._id === sessionId);

      if (!session) return;

      const otherPerson =
        user?._id === session.tutor?._id ? session.learner : session.tutor;

      setSessionDetails({
        otherPerson,
        skillName:
          session.sessionType === "exchange"
            ? `${session.exchangeRequest?.exchange?.offerSkill || "Exchange"} ↔ ${
                session.exchangeRequest?.exchange?.wantSkill || "Session"
              }`
            : session.request?.listing?.skillName || "No skill attached",
        skillDescription:
          session.request?.listing?.description ||
          session.exchangeRequest?.message ||
          "Session details and learning goals will appear here.",
        sessionType: session.sessionType || "regular",
        deliveryMode: session.deliveryMode || "online",
        status: session.status || "scheduled",
      });

      if (session?.roomUrl && session.roomUrl.includes("meet.google.com")) {
        setRoomUrl(session.roomUrl);
      } else {
        setRoomUrl("");
      }
    } catch (error) {
      console.error("Failed to load session details", error);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchSession();
  }, [sessionId, user?._id]);

  useEffect(() => {
    socket.emit("join_session", sessionId);

    const handleNewMessage = (newMessage) => {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newMessage._id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    };

    const handleTyping = () => setIsOtherTyping(true);
    const handleStopTyping = () => setIsOtherTyping(false);

    const handleMessagesRead = ({ readerId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (String(msg.sender?._id) === String(user?._id)) {
            const alreadyRead = (msg.readBy || []).includes(readerId);
            if (alreadyRead) return msg;
            return { ...msg, readBy: [...(msg.readBy || []), readerId] };
          }
          return msg;
        })
      );
    };

    socket.on("new_session_message", handleNewMessage);
    socket.on("session_typing", handleTyping);
    socket.on("session_stop_typing", handleStopTyping);
    socket.on("session_messages_read", handleMessagesRead);

    return () => {
      socket.emit("leave_session", sessionId);
      socket.off("new_session_message", handleNewMessage);
      socket.off("session_typing", handleTyping);
      socket.off("session_stop_typing", handleStopTyping);
      socket.off("session_messages_read", handleMessagesRead);
    };
  }, [sessionId, user?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const firstOtherUser = useMemo(
    () =>
      messages.find(
        (msg) => String(msg.sender?._id) !== String(user?._id)
      )?.sender,
    [messages, user?._id]
  );

  const getAvatarUrl = (person) => {
    const avatar = person?.avatar || person?.profileImage || person?.image || "";
    if (!avatar) return "";
    return avatar.startsWith("http") ? avatar : `${API_BASE_URL}${avatar}`;
  };

  const headerPerson = sessionDetails?.otherPerson || firstOtherUser;
  const headerName = headerPerson?.name || "Session Chat";
  const headerId = headerPerson?.publicId || "Live conversation";
  const headerAvatar = getAvatarUrl(headerPerson);

  const skillName = sessionDetails?.skillName || "No skill attached";
  const skillDescription =
    sessionDetails?.skillDescription ||
    "Session details and learning goals will appear here.";

  const sessionType = sessionDetails?.sessionType || "regular";
  const deliveryMode = sessionDetails?.deliveryMode || "online";
  const sessionStatus = sessionDetails?.status || "scheduled";

  const meetLink = roomUrl && roomUrl.includes("meet.google.com") ? roomUrl : "";

  const handleTypingChange = (value) => {
    setText(value);
    socket.emit("session_typing", {
      sessionId,
      userName: user?.name || "Someone",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("session_stop_typing", { sessionId });
    }, 1200);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMenuOpen(false);
    }
    e.target.value = "";
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!text.trim() && !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("text", text);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await api.post("/messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setText("");
      setSelectedFile(null);
      socket.emit("session_stop_typing", { sessionId });
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to send message",
        "error"
      );
    }
  };

  const getAttachmentUrl = (attachment) => {
    if (!attachment?.url) return "";
    if (attachment.url.startsWith("http")) return attachment.url;
    return `${API_BASE_URL}${attachment.url}`;
  };

  const renderAttachment = (attachment) => {
    if (!attachment) return null;

    const url = getAttachmentUrl(attachment);

    if (attachment.fileType === "image") {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="chat-attachment-image-link"
        >
          <img
            src={url}
            alt={attachment.fileName || "attachment"}
            className="chat-attachment-image"
          />
        </a>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="chat-attachment-file"
      >
        <div className="chat-attachment-file-icon">
          {attachment.fileType === "document" ? "📄" : "📎"}
        </div>
        <div className="chat-attachment-file-copy">
          <div className="chat-attachment-file-name">
            {attachment.fileName || "Attachment"}
          </div>
          <div className="chat-attachment-file-meta">
            {attachment.mimeType || attachment.fileType}
          </div>
        </div>
      </a>
    );
  };

  const isSeen = (msg) => {
    if (String(msg.sender?._id) !== String(user?._id)) return false;
    return (msg.readBy || []).some((id) => String(id) !== String(user?._id));
  };

  const isUnreadForCurrentUser = (msg) => {
    const isOwn = String(msg.sender?._id) === String(user?._id);
    if (isOwn) return false;

    return !(msg.readBy || []).some(
      (id) => String(id) === String(user?._id)
    );
  };

  const getDayKey = (dateValue) => {
    const date = new Date(dateValue);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const getDayLabel = (dateValue) => {
    const date = new Date(dateValue);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const firstUnreadIndex = messages.findIndex((msg) => isUnreadForCurrentUser(msg));

  const renderAvatar = (className = "") => {
    if (headerAvatar) {
      return (
        <img
          src={headerAvatar}
          alt={headerName}
          className={`ww-avatar-img ${className}`}
        />
      );
    }

    return (
      <div className={`ww-avatar-init ${className}`}>
        {headerName?.charAt(0)?.toUpperCase() || "C"}
      </div>
    );
  };

  return (
    <div className="page chat-page">
      <div className="ww-layout">
        <aside className="ww-sidebar">
          <div className="ww-sidebar-header">
            <div className="ww-avatar-lg">{renderAvatar("ww-avatar-lg-media")}</div>
            <div className="ww-sidebar-header-info">
              <div className="ww-sidebar-title">{headerName}</div>
              <div className="ww-sidebar-subtitle">@{headerId}</div>
              <div className="ww-status-badge">
                <span className="ww-status-dot"></span>
                {sessionStatus === "scheduled" ? "Active Session" : sessionStatus}
              </div>
            </div>
          </div>

          <div className="ww-sidebar-card ww-skill-card">
            <div className="ww-card-heading">
              <div className="ww-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 6.5V21M12 6.5C10.85 5.45 9.32 4.85 7.75 4.85H4.5C3.67 4.85 3 5.52 3 6.35V17.85C3 18.68 3.67 19.35 4.5 19.35H7.75C9.32 19.35 10.85 19.95 12 21M12 6.5C13.15 5.45 14.68 4.85 16.25 4.85H19.5C20.33 4.85 21 5.52 21 6.35V17.85C21 18.68 20.33 19.35 19.5 19.35H16.25C14.68 19.35 13.15 19.95 12 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="ww-info-label">Learning Focus</div>
                <div className="ww-skill-name">{skillName}</div>
              </div>
            </div>
            <div className="ww-skill-description">{skillDescription}</div>
          </div>

          <div className="ww-sidebar-card">
            <div className="ww-card-heading">
              <div className="ww-card-icon ww-card-icon-blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="ww-info-label">Session Type</div>
                <div className="ww-skill-name">{sessionType}</div>
              </div>
            </div>
            <div className="ww-meta-pills">
              <span>{deliveryMode}</span>
              <span>{sessionStatus}</span>
            </div>
          </div>

          <div className="ww-sidebar-card ww-sidebar-card--meet">
            <div className="ww-card-heading">
              <div className="ww-card-icon ww-card-icon-green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.75 15.25V8.75L15.25 12L9.75 15.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="ww-info-label ww-info-label--meet">Video Session</div>
                <div className="ww-skill-name">Google Meet</div>
              </div>
            </div>
            {meetLink ? (
              <a
                href={meetLink}
                target="_blank"
                rel="noreferrer"
                className="btn-join-call btn-join-call--pulse"
              >
                Join Meet Session
              </a>
            ) : (
              <div className="ww-meet-unavailable">
                No video link available
              </div>
            )}
          </div>

          <div className="ww-sidebar-note">
            <div className="ww-note-icon">💡</div>
            <div>Coordinate timing, share materials, and keep follow-ups in one clean conversation.</div>
          </div>
        </aside>

        <section className="ww-chat-panel">
          <div className="ww-chat-header">
            <div className="ww-chat-header-left">
              <div className="ww-avatar">{renderAvatar("ww-avatar-media")}</div>

              <div className="ww-chat-header-info">
                <div className="ww-chat-name">{headerName}</div>
                <div className="ww-chat-id">@{headerId}</div>
                <div className="ww-chat-status">
                  {isOtherTyping ? (
                    <span className="ww-typing-text">
                      <span className="ww-typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                      typing...
                    </span>
                  ) : (
                    skillName
                  )}
                </div>
              </div>
            </div>

            {meetLink ? (
              <a
                href={meetLink}
                target="_blank"
                rel="noreferrer"
                className="btn-join-call btn-join-call--header"
              >
                Join Call
              </a>
            ) : (
              <span className="ww-chat-header-meet-note">
                No active call
              </span>
            )}
          </div>

          <div className="ww-chat-body">
            {loading ? (
              <div className="empty-state">
                <div className="empty-state-spinner"></div>
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending your first message.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwnMessage =
                  String(user?._id) === String(msg.sender?._id);

                const previousMessage = messages[index - 1];
                const nextMessage = messages[index + 1];

                const startsNewDay =
                  index === 0 ||
                  getDayKey(previousMessage?.createdAt) !== getDayKey(msg.createdAt);

                const isFirstUnread = index === firstUnreadIndex;

                const sameSenderAsPrevious =
                  previousMessage &&
                  String(previousMessage.sender?._id) === String(msg.sender?._id) &&
                  getDayKey(previousMessage.createdAt) === getDayKey(msg.createdAt);

                const sameSenderAsNext =
                  nextMessage &&
                  String(nextMessage.sender?._id) === String(msg.sender?._id) &&
                  getDayKey(nextMessage.createdAt) === getDayKey(msg.createdAt);

                const showSender = !isOwnMessage && !sameSenderAsPrevious;

                return (
                  <div key={msg._id} className="ww-message-wrapper">
                    {startsNewDay && (
                      <div className="ww-day-separator">
                        <span>{getDayLabel(msg.createdAt)}</span>
                      </div>
                    )}

                    {isFirstUnread && (
                      <div className="ww-unread-divider">
                        <span>Unread messages</span>
                      </div>
                    )}

                    <div
                      className={`ww-row ${isOwnMessage ? "own" : "other"} ${
                        sameSenderAsPrevious ? "grouped-top" : ""
                      } ${
                        sameSenderAsNext ? "grouped-bottom" : ""
                      }`}
                    >
                      <div className={`ww-bubble ${isOwnMessage ? "own" : "other"}`}>
                        {showSender && (
                          <div className="ww-sender">
                            {msg.sender?.name || "Unknown User"}
                            {msg.sender?.publicId ? ` • ${msg.sender.publicId}` : ""}
                          </div>
                        )}

                        {msg.text ? <div className="ww-text">{msg.text}</div> : null}
                        {renderAttachment(msg.attachment)}

                        <div className="ww-time">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : ""}
                          {isOwnMessage && (
                            <span className={`ww-read-status ${isSeen(msg) ? "seen" : ""}`}>
                              {isSeen(msg) ? " ✓✓" : " ✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isOtherTyping && (
              <div className="ww-typing-indicator">
                <div className="ww-typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {selectedFile && (
            <div className="ww-selected-file">
              <div className="ww-selected-file-info">
                <span className="ww-selected-file-icon">
                  {selectedFile.type.startsWith("image/") ? "🖼️" : "📎"}
                </span>
                <span className="ww-selected-file-name">{selectedFile.name}</span>
                <span className="ww-selected-file-size">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="ww-remove-file"
              >
                ✕
              </button>
            </div>
          )}

          <form className="ww-composer" onSubmit={handleSend}>
            <div className="ww-attach-wrap">
              <button
                type="button"
                className="ww-attach-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Attach file"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 5V15M5 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="ww-attach-overlay" onClick={() => setMenuOpen(false)} />
                  <div className="ww-attach-menu">
                    <button
                      type="button"
                      className="ww-attach-menu-item"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <span className="ww-attach-icon">🖼️</span>
                      <span>Image</span>
                    </button>
                    <button
                      type="button"
                      className="ww-attach-menu-item"
                      onClick={() => documentInputRef.current?.click()}
                    >
                      <span className="ww-attach-icon">📄</span>
                      <span>Document</span>
                    </button>
                    <button
                      type="button"
                      className="ww-attach-menu-item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="ww-attach-icon">📎</span>
                      <span>File</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <textarea
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTypingChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />

            <button
              type="submit"
              className="ww-send-btn"
              disabled={!text.trim() && !selectedFile}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              ref={documentInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </form>
        </section>
      </div>
    </div>
  );
}

export default Chat;
