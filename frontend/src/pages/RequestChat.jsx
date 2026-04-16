import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api, { API_BASE_URL } from "../api/axios";
import socket from "../socket";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function RequestChat() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/request-messages/${requestId}`);
      setMessages(res.data);
    } catch (error) {
      console.error("Failed to load request messages", error);
      showToast(error.response?.data?.message || "Failed to load messages", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [requestId]);

  useEffect(() => {
    socket.emit("join_request", requestId);

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
          if (msg.sender?._id === user?._id) {
            const alreadyRead = (msg.readBy || []).includes(readerId);
            if (alreadyRead) return msg;
            return { ...msg, readBy: [...(msg.readBy || []), readerId] };
          }
          return msg;
        })
      );
    };

    socket.on("new_request_message", handleNewMessage);
    socket.on("request_typing", handleTyping);
    socket.on("request_stop_typing", handleStopTyping);
    socket.on("request_messages_read", handleMessagesRead);

    return () => {
      socket.emit("leave_request", requestId);
      socket.off("new_request_message", handleNewMessage);
      socket.off("request_typing", handleTyping);
      socket.off("request_stop_typing", handleStopTyping);
      socket.off("request_messages_read", handleMessagesRead);
    };
  }, [requestId, user?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const firstOtherUser = useMemo(
    () => messages.find((msg) => msg.sender?._id !== user?._id)?.sender,
    [messages, user?._id]
  );

  const headerName = firstOtherUser?.name || "Request Chat";
  const headerId = firstOtherUser?.publicId || "Pre-session conversation";

  const handleTypingChange = (value) => {
    setText(value);
    socket.emit("request_typing", {
      requestId,
      userName: user?.name || "Someone",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("request_stop_typing", { requestId });
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
      formData.append("requestId", requestId);
      formData.append("text", text);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await api.post("/request-messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setText("");
      setSelectedFile(null);
      socket.emit("request_stop_typing", { requestId });
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to send message", "error");
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
        <a href={url} target="_blank" rel="noreferrer" className="chat-attachment-image-link">
          <img
            src={url}
            alt={attachment.fileName || "attachment"}
            className="chat-attachment-image"
          />
        </a>
      );
    }

    return (
      <a href={url} target="_blank" rel="noreferrer" className="chat-attachment-file">
        <div className="chat-attachment-file-icon">
          {attachment.fileType === "document" ? "📄" : "📎"}
        </div>
        <div>
          <div className="chat-attachment-file-name">{attachment.fileName || "Attachment"}</div>
          <div className="chat-attachment-file-meta">
            {attachment.mimeType || attachment.fileType}
          </div>
        </div>
      </a>
    );
  };

  const isSeen = (msg) => {
    if (msg.sender?._id !== user?._id) return false;
    return (msg.readBy || []).some((id) => String(id) !== String(user?._id));
  };

  return (
    <div className="page">
      <div className="ww-layout">
        <aside className="ww-sidebar">
          <div className="ww-sidebar-header">
            <div className="ww-avatar-lg">{headerName?.charAt(0)?.toUpperCase() || "R"}</div>
            <div>
              <div className="ww-sidebar-title">{headerName}</div>
              <div className="ww-sidebar-subtitle">{headerId}</div>
            </div>
          </div>

          <div className="ww-sidebar-card">
            <div className="ww-info-label">Conversation Type</div>
            <div className="ww-info-value">Request Chat</div>
          </div>

          <div className="ww-sidebar-card">
            <div className="ww-info-label">Request ID</div>
            <div className="ww-info-value ww-break">{requestId}</div>
          </div>

          <div className="ww-sidebar-card">
            <div className="ww-info-label">Messages</div>
            <div className="ww-info-value">{messages.length}</div>
          </div>

          <div className="ww-sidebar-note">
            Use this chat to discuss availability, expectations, schedule, and session setup before booking.
          </div>
        </aside>

        <section className="ww-chat-panel">
          <div className="ww-chat-header">
            <div className="ww-chat-header-left">
              <div className="ww-avatar">{headerName?.charAt(0)?.toUpperCase() || "R"}</div>
              <div>
                <div className="ww-chat-name">{headerName}</div>
                <div className="ww-chat-status">
                  {isOtherTyping ? "typing..." : "Request discussion"}
                </div>
              </div>
            </div>
          </div>

          <div className="ww-chat-body">
            {loading ? (
              <div className="empty-state">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="empty-state">No messages yet. Start the conversation.</div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = user?._id === msg.sender?._id;

                return (
                  <div key={msg._id} className={`ww-row ${isOwnMessage ? "own" : "other"}`}>
                    <div className={`ww-bubble ${isOwnMessage ? "own" : "other"}`}>
                      {!isOwnMessage && (
                        <div className="ww-sender">
                          {msg.sender?.name || "Unknown User"}
                          {msg.sender?.publicId ? ` • ${msg.sender.publicId}` : ""}
                        </div>
                      )}

                      {msg.text ? <div className="ww-text">{msg.text}</div> : null}
                      {renderAttachment(msg.attachment)}

                      <div className="ww-time">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                        {isOwnMessage && (
                          <span className={`ww-read-status ${isSeen(msg) ? "seen" : ""}`}>
                            {isSeen(msg) ? " ✓✓" : " ✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isOtherTyping && <div className="ww-typing-indicator">Typing...</div>}
            <div ref={bottomRef} />
          </div>

          <form className="ww-composer" onSubmit={handleSend}>
            <div className="ww-attach-wrap">
              <button
                type="button"
                className="ww-attach-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                📎
              </button>

              {menuOpen && (
                <div className="ww-attach-menu">
                  <button
                    type="button"
                    className="ww-attach-menu-item"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    🖼️ Image
                  </button>
                  <button
                    type="button"
                    className="ww-attach-menu-item"
                    onClick={() => documentInputRef.current?.click()}
                  >
                    📄 Document
                  </button>
                  <button
                    type="button"
                    className="ww-attach-menu-item"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎 File
                  </button>
                </div>
              )}
            </div>

            <textarea
              placeholder="Type a message"
              value={text}
              onChange={(e) => handleTypingChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />

            <button type="submit">Send</button>

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

          {selectedFile && (
            <div className="ww-selected-file">
              <span>📎 {selectedFile.name}</span>
              <button type="button" onClick={() => setSelectedFile(null)}>
                Remove
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default RequestChat;