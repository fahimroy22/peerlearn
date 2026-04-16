import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api, { API_BASE_URL } from "../api/axios";
import socket from "../socket";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function ExchangeChat() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [conversation, setConversation] = useState(null);

  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchConversation = async () => {
    try {
      const res = await api.get("/exchange-conversations");
      const currentConversation = (res.data || []).find(
        (item) => item._id === conversationId
      );
      setConversation(currentConversation || null);
    } catch (error) {
      console.error("Failed to load exchange conversation", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/exchange-messages/${conversationId}`);
      setMessages(res.data || []);
    } catch (error) {
      console.error("Failed to load exchange messages", error);
      showToast(
        error.response?.data?.message || "Failed to load exchange messages",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    socket.emit("join_exchange", conversationId);

    const handleNewMessage = (newMessage) => {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newMessage._id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    };

    const handleTyping = () => setIsOtherTyping(true);
    const handleStopTyping = () => setIsOtherTyping(false);

    socket.on("new_exchange_message", handleNewMessage);
    socket.on("exchange_typing", handleTyping);
    socket.on("exchange_stop_typing", handleStopTyping);

    return () => {
      socket.emit("leave_exchange", conversationId);
      socket.off("new_exchange_message", handleNewMessage);
      socket.off("exchange_typing", handleTyping);
      socket.off("exchange_stop_typing", handleStopTyping);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const otherPerson = useMemo(() => {
    if (!conversation) return null;

    return String(user?._id) === String(conversation.userOne?._id)
      ? conversation.userTwo
      : conversation.userOne;
  }, [conversation, user?._id]);

  const handleTypingChange = (value) => {
    setText(value);
    socket.emit("exchange_typing", {
      conversationId,
      userName: user?.name || "Someone",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("exchange_stop_typing", { conversationId });
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
      formData.append("conversationId", conversationId);
      formData.append("text", text);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await api.post("/exchange-messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setText("");
      setSelectedFile(null);
      socket.emit("exchange_stop_typing", { conversationId });
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
        <div>
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

  const headerName = otherPerson?.name || "Exchange Chat";
  const headerId = otherPerson?.publicId || "Skill exchange";
  const exchangeTitle = conversation?.exchange
    ? `${conversation.exchange.offerSkill} ↔ ${conversation.exchange.wantSkill}`
    : "Skill exchange discussion";

  return (
    <div className="page">
      <div className="ww-layout">
        <aside className="ww-sidebar">
          <div className="ww-sidebar-header">
            <div className="ww-avatar-lg">
              {headerName?.charAt(0)?.toUpperCase() || "E"}
            </div>
            <div>
              <div className="ww-sidebar-title">{headerName}</div>
              <div className="ww-sidebar-subtitle">{headerId}</div>
            </div>
          </div>

          <div className="ww-sidebar-card ww-skill-card">
            <div className="ww-info-label">Exchange Info</div>
            <div className="ww-skill-name">{exchangeTitle}</div>
            <div className="ww-skill-description">
              Use this space to coordinate your exchange plan, timing, and learning goals.
            </div>
          </div>

          <div className="ww-sidebar-note">
            This is your dedicated exchange conversation.
          </div>
        </aside>

        <section className="ww-chat-panel">
          <div className="ww-chat-header">
            <div className="ww-chat-header-left">
              <div className="ww-avatar">
                {headerName?.charAt(0)?.toUpperCase() || "E"}
              </div>

              <div>
                <div className="ww-chat-name">{headerName}</div>
                <div className="ww-chat-id">{headerId}</div>
                <div className="ww-chat-status">
                  {isOtherTyping ? "typing..." : exchangeTitle}
                </div>
              </div>
            </div>
          </div>

          <div className="ww-chat-body">
            {loading ? (
              <div className="empty-state">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = String(user?._id) === String(msg.sender?._id);

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
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : ""}
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

export default ExchangeChat;