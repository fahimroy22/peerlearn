import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMySupportTickets } from "../api/supportApi";
import useToast from "../context/useToast";

function MySupportTickets() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await getMySupportTickets();
      setTickets(data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load support tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const grouped = useMemo(() => {
    const open = [];
    const resolved = [];

    tickets.forEach((ticket) => {
      if (["resolved", "closed"].includes(ticket.status)) {
        resolved.push(ticket);
      } else {
        open.push(ticket);
      }
    });

    return { open, resolved };
  }, [tickets]);

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStatus = (status) => {
    const labelMap = {
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed",
    };

    return (
      <span className={`sm-status is-${status || "open"}`}>
        {labelMap[status] || status}
      </span>
    );
  };

  return (
    <div className="page">
      <div className="sm-page">
        <section className="sm-header">
          <div className="sm-eyebrow">⚡ Support</div>
          <h1 className="sm-title">My Support Tickets</h1>
          <p className="sm-subtitle">
            Track open issues, continue support chats, and review resolved tickets.
          </p>
        </section>

        <div className="sm-topbar">
          <Link to="/support/new">
            <button type="button" className="st-submit-btn">
              Open New Ticket
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="sm-empty">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="sm-empty">
            <h3>No support tickets yet</h3>
            <p>When you create a support request, it will appear here.</p>
          </div>
        ) : (
          <div className="sm-layout">
            <section className="sm-main">
              <div className="sm-section-label">Open tickets</div>

              {grouped.open.length === 0 ? (
                <div className="sm-empty small">No open tickets.</div>
              ) : (
                <div className="sm-list">
                  {grouped.open.map((ticket) => (
                    <button
                      key={ticket._id}
                      type="button"
                      className="sm-card"
                      onClick={() => navigate(`/support/${ticket._id}`)}
                    >
                      <div className="sm-card-top">
                        <div>
                          <div className="sm-card-title">{ticket.subject}</div>
                          <div className="sm-card-meta">
                            {ticket.category} • Updated {formatDate(ticket.updatedAt)}
                          </div>
                        </div>

                        <div>{renderStatus(ticket.status)}</div>
                      </div>

                      <div className="sm-card-bottom">
                        <span className="sm-chip">
                          Priority: {ticket.priority}
                        </span>
                        <span className="sm-chip">
                          {ticket.assignedAdmin ? "Assigned" : "Waiting for admin"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="sm-section-label sm-mt">Resolved tickets</div>

              {grouped.resolved.length === 0 ? (
                <div className="sm-empty small">No resolved tickets yet.</div>
              ) : (
                <div className="sm-list">
                  {grouped.resolved.map((ticket) => (
                    <button
                      key={ticket._id}
                      type="button"
                      className="sm-card is-muted"
                      onClick={() => navigate(`/support/${ticket._id}`)}
                    >
                      <div className="sm-card-top">
                        <div>
                          <div className="sm-card-title">{ticket.subject}</div>
                          <div className="sm-card-meta">
                            {ticket.category} • Updated {formatDate(ticket.updatedAt)}
                          </div>
                        </div>

                        <div>{renderStatus(ticket.status)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="sm-side">
              <div className="sm-side-card">
                <div className="sm-side-title">Ticket status guide</div>
                <ul className="sm-side-list">
                  <li><strong>Open:</strong> waiting for review.</li>
                  <li><strong>In Progress:</strong> admin is handling it.</li>
                  <li><strong>Resolved:</strong> issue addressed.</li>
                  <li><strong>Closed:</strong> conversation finished.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default MySupportTickets;