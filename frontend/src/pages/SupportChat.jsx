import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getSupportMessages,
  getMySupportTickets,
  sendSupportMessage,
} from "../api/supportApi";
import socket, {
  joinSupportTicketRoom,
  leaveSupportTicketRoom,
} from "../socket";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import { API_BASE_URL } from "../api/axios";

function SupportChat() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [messageData, ticketData] = await Promise.all([
        getSupportMessages(ticketId),
        getMySupportTickets(),
      ]);

      setMessages(messageData || []);
      setTicket((ticketData || []).find((item) => item._id === ticketId) || null);
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to load support ticket",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  useEffect(() => {
    joinSupportTicketRoom(ticketId);

    const handleNewMessage = (newMessage) => {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newMessage._id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    };

    const handleTyping = () => setIsOtherTyping(true);
    const handleStopTyping = () => setIsOtherTyping(false);

    socket.on("new_support_message", handleNewMessage);
    socket.on("support_typing", handleTyping);
    socket.on("support_stop_typing", handleStopTyping);

    return () => {
      leaveSupportTicketRoom(ticketId);
      socket.off("new_support_message", handleNewMessage);
      socket.off("support_typing", handleTyping);
      socket.off("support_stop_typing", handleStopTyping);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const statusLabel = useMemo(() => {
    if (!ticket?.status) return "Open";
    if (ticket.status === "in_progress") return "In Progress";
    if (ticket.status === "resolved") return "Resolved";
    if (ticket.status === "closed") return "Closed";
    return "Open";
  }, [ticket]);

  const handleTypingChange = (value) => {
    setText(value);

    socket.emit("support_typing", {
      ticketId,
      userName: user?.name || "Someone",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("support_stop_typing", { ticketId });
    }, 1200);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!text.trim() && !selectedFile) return;

    try {
      setSending(true);

      const payload = new FormData();
      payload.append("ticketId", ticketId);
      payload.append("text", text);

      if (selectedFile) {
        payload.append("file", selectedFile);
      }

      await sendSupportMessage(payload);

      setText("");
      setSelectedFile(null);
      socket.emit("support_stop_typing", { ticketId });
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to send support message",
        "error"
      );
    } finally {
      setSending(false);
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

  const quickReply = () => {
    setText("I still need help from an admin.");
  };

  return (
    <div className="page">
      <div className="sc-page">
        {loading ? (
          <div className="sc-empty">Loading support chat...</div>
        ) : (
          <div className="sc-layout">
            <section className="sc-main">
              <div className="sc-topcard">
                <div className="sc-topcard-main">
                  <div className="sc-eyebrow">⚡ Support</div>
                  <h1 className="sc-title">{ticket?.subject || "Support Ticket"}</h1>

                  <div className="sc-meta">
                    <span className={`sc-status is-${ticket?.status || "open"}`}>
                      {statusLabel}
                    </span>
                    <span className="sc-chip">{ticket?.category || "other"}</span>
                    <span className="sc-chip">
                      Priority: {ticket?.priority || "medium"}
                    </span>
                  </div>
                </div>

                <div className="sc-topcard-actions">
                  <button
                    type="button"
                    className="support-secondary-button"
                    onClick={quickReply}
                  >
                    Request admin help
                  </button>
                </div>
              </div>

              <div className="sc-conversation-card">
                <div className="sc-thread">
                  {messages.length === 0 ? (
                    <div className="sc-empty small">No messages yet.</div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn =
                        msg.senderType === "user" &&
                        String(msg.sender?._id) === String(user?._id);

                      const rowClass = isOwn ? "own" : "other";
                      const senderLabel =
                        msg.senderType === "bot"
                          ? "Auto Reply"
                          : msg.senderType === "admin"
                          ? "Support Admin"
                          : msg.sender?.name || "You";

                      return (
                        <div key={msg._id} className={`sc-row ${rowClass}`}>
                          <div
                            className={`sc-bubble ${rowClass} ${
                              msg.senderType === "bot" ? "is-bot" : ""
                            } ${
                              msg.senderType === "admin" ? "is-admin" : ""
                            }`}
                          >
                            {!isOwn && <div className="sc-sender">{senderLabel}</div>}

                            {msg.text ? <div className="sc-text">{msg.text}</div> : null}
                            {renderAttachment(msg.attachment)}

                            <div className="sc-time">
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

                  {isOtherTyping && (
                    <div className="sc-typing">Support is typing...</div>
                  )}

                  <div ref={bottomRef} />
                </div>

                <form className="sc-composer" onSubmit={handleSend}>
                  <button
                    type="button"
                    className="sc-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach file"
                  >
                    📎
                  </button>

                  <textarea
                    placeholder="Write your reply..."
                    value={text}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />

                  <button type="submit" className="sc-send-btn" disabled={sending}>
                    {sending ? "Sending..." : "Send"}
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </form>

                {selectedFile && (
                  <div className="sc-filebar">
                    <span className="sc-filebar-name">📎 {selectedFile.name}</span>
                    <button
                      type="button"
                      className="st-remove-btn"
                      onClick={() => setSelectedFile(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="sc-side">
              <div className="sc-side-card">
                <div className="sc-side-title">Ticket summary</div>
                <ul className="sc-side-list">
                  <li><strong>Subject:</strong> {ticket?.subject || "-"}</li>
                  <li><strong>Category:</strong> {ticket?.category || "-"}</li>
                  <li><strong>Status:</strong> {statusLabel}</li>
                  <li><strong>Priority:</strong> {ticket?.priority || "-"}</li>
                </ul>
              </div>

              <div className="sc-side-card">
                <div className="sc-side-title">What happens next</div>
                <ul className="sc-side-list">
                  <li>Auto replies can give instant help first.</li>
                  <li>An admin joins if more review is needed.</li>
                  <li>You can continue replying in this same thread.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupportChat;