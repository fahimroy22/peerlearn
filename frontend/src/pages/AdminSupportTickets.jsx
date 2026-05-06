import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import {
  assignSupportTicket,
  deleteResolvedSupportTicket,
  getAdminWorkload,
  getAllSupportTickets,
  reassignSupportTicket,
  updateSupportTicketStatus,
} from "../api/adminApi";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function AdminSupportTickets() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profileUser, setProfileUser] = useState(null);

  const activeUser = profileUser || user || {};
  const isSuperAdmin =
    Boolean(activeUser?.isAdmin) &&
    String(activeUser?.adminRole || "").toLowerCase() === "super_admin";

  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const [ticketView, setTicketView] = useState("all");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("priority");

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setProfileUser(res.data);
    } catch (error) {
      console.error("Failed to load admin profile:", error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const data = await getAllSupportTickets({
        status,
        priority,
        category,
        search,
      });

      setTickets(data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed loading tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const data = await getAdminWorkload();
      setAdmins(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAdmins();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchTickets, 250);
    return () => clearTimeout(timer);
  }, [status, priority, category, search]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((item) => item.status === "open").length,
      inProgress: tickets.filter((item) => item.status === "in_progress").length,
      resolved: tickets.filter((item) => item.status === "resolved").length,
      assignedToMe: tickets.filter(
        (ticket) => String(ticket.assignedAdmin?._id) === String(activeUser?._id)
      ).length,
      unassigned: tickets.filter((ticket) => !ticket.assignedAdmin).length,
      highPriority: tickets.filter((ticket) => ticket.priority === "high").length,
      mediumPriority: tickets.filter((ticket) => ticket.priority === "medium").length,
      lowPriority: tickets.filter((ticket) => ticket.priority === "low").length,
    };
  }, [tickets, activeUser?._id]);

  const availableAdmins = useMemo(() => {
    return admins.filter((item) => item.available);
  }, [admins]);

  const visibleTickets = useMemo(() => {
    let filteredTickets = tickets;

    if (ticketView === "assigned_to_me") {
      filteredTickets = tickets.filter(
        (ticket) => String(ticket.assignedAdmin?._id) === String(activeUser?._id)
      );
    }

    if (ticketView === "unassigned") {
      filteredTickets = tickets.filter((ticket) => !ticket.assignedAdmin);
    }

    const priorityWeight = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...filteredTickets].sort((a, b) => {
      if (sortBy === "priority") {
        return (
          (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
        );
      }

      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [tickets, ticketView, activeUser?._id, sortBy]);

  const activeFiltersCount = useMemo(() => {
    return [status, priority, category, search].filter(Boolean).length;
  }, [status, priority, category, search]);

  const nextActionText = useMemo(() => {
    if (stats.unassigned > 0) {
      return `Assign ${stats.unassigned} unowned ticket${
        stats.unassigned === 1 ? "" : "s"
      } first.`;
    }

    if (stats.highPriority > 0) {
      return `Review ${stats.highPriority} high-priority ticket${
        stats.highPriority === 1 ? "" : "s"
      }.`;
    }

    if (stats.inProgress > 0) {
      return "Follow up on in-progress tickets.";
    }

    return "Queue looks stable right now.";
  }, [stats]);

  const handleAssignToMe = async (id) => {
    try {
      setWorkingId(id);
      await assignSupportTicket(id);
      showToast("Ticket assigned to you", "success");
      await fetchTickets();
      await fetchAdmins();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed assigning ticket", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleAssignOrReassign = async (ticketId, adminId) => {
    if (!adminId) return;

    try {
      setWorkingId(ticketId);
      await reassignSupportTicket(ticketId, adminId);
      showToast("Ticket assigned successfully", "success");
      await fetchTickets();
      await fetchAdmins();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed assigning ticket", "error");
    } finally {
      setWorkingId("");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      setWorkingId(id);
      await updateSupportTicketStatus(id, newStatus);
      showToast("Ticket updated", "success");
      await fetchTickets();
      await fetchAdmins();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed updating ticket", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleDelete = async (ticket) => {
    const confirmed = window.confirm(
      "Delete this resolved ticket? Its data will stay saved in audit logs."
    );

    if (!confirmed) return;

    try {
      setWorkingId(ticket._id);
      await deleteResolvedSupportTicket(ticket._id);
      showToast("Ticket deleted and saved in audit logs", "success");
      await fetchTickets();
      await fetchAdmins();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed deleting ticket", "error");
    } finally {
      setWorkingId("");
    }
  };

  const clearFilters = () => {
    setStatus("");
    setPriority("");
    setCategory("");
    setSearch("");
    setTicketView("all");
    setSortBy("priority");
  };

  const getTicketPreview = (ticket) => {
    return (
      ticket.message ||
      ticket.description ||
      ticket.body ||
      "Open this ticket to review the full support conversation."
    );
  };

  return (
    <div className="page au-shell-page">
      <div className="au-page">
        <section className="au-header au-hero">
          <div>
            <div className="au-eyebrow">Admin Support</div>
            <h1 className="au-title">Support Tickets</h1>
            <p className="au-subtitle">
              Review issues, assign ownership, track progress, and keep learner
              support moving from one organized workspace.
            </p>
          </div>

          <div className="au-hero-panel">
            <span>Queue Status</span>
            <strong>{stats.open + stats.inProgress}</strong>
            <p>active ticket{stats.open + stats.inProgress === 1 ? "" : "s"}</p>
          </div>
        </section>

        <section className="au-stats au-stats-compact">
          <div className="au-stat featured">
            <div className="au-stat-label">Total</div>
            <div className="au-stat-value">{stats.total}</div>
            <p>All matching tickets</p>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Assigned</div>
            <div className="au-stat-value">{stats.assignedToMe}</div>
            <p>Your queue</p>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Unassigned</div>
            <div className="au-stat-value">{stats.unassigned}</div>
            <p>Needs owner</p>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Resolved</div>
            <div className="au-stat-value">{stats.resolved}</div>
            <p>Completed</p>
          </div>
        </section>

        <section className="au-support-console">
          <main className="au-support-main">
            <section className="au-command-panel au-command-panel-compact">
              <div className="au-command-head">
                <div>
                  <div className="au-eyebrow">Ticket Views</div>
                  <h2>Queue Filters</h2>
                  <p>Switch views, search the queue, or sort tickets by urgency.</p>
                </div>

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    className="au-btn ghost"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="au-view-tabs au-segmented-tabs">
                <button
                  type="button"
                  className={`au-view-tab ${ticketView === "all" ? "active" : ""}`}
                  onClick={() => setTicketView("all")}
                >
                  <span>All</span>
                  <strong>{stats.total}</strong>
                </button>

                <button
                  type="button"
                  className={`au-view-tab ${
                    ticketView === "assigned_to_me" ? "active" : ""
                  }`}
                  onClick={() => setTicketView("assigned_to_me")}
                >
                  <span>Mine</span>
                  <strong>{stats.assignedToMe}</strong>
                </button>

                <button
                  type="button"
                  className={`au-view-tab ${
                    ticketView === "unassigned" ? "active" : ""
                  }`}
                  onClick={() => setTicketView("unassigned")}
                >
                  <span>Unowned</span>
                  <strong>{stats.unassigned}</strong>
                </button>
              </div>

              <div className="au-filter-grid au-filter-grid-elite">
                <input
                  className="au-search"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="au-filter"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  className="au-filter"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <select
                  className="au-filter"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="login">Login</option>
                  <option value="account">Account</option>
                  <option value="listing">Listing</option>
                  <option value="session">Session</option>
                  <option value="exchange">Exchange</option>
                  <option value="bug">Bug</option>
                  <option value="other">Other</option>
                </select>

                <select
                  className="au-filter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="priority">Priority First</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </section>

            {loading ? (
              <div className="au-empty">Loading tickets...</div>
            ) : visibleTickets.length === 0 ? (
              <div className="au-empty au-empty-elite">
                <div className="au-empty-icon">✓</div>
                <strong>No tickets found</strong>
                <span>Try clearing filters or switching to another view.</span>
              </div>
            ) : (
              <section className="au-list">
                {visibleTickets.map((ticket) => {
                  const ticketStatus = String(ticket.status || "").toLowerCase();
                  const ticketPriority = String(ticket.priority || "").toLowerCase();
                  const isResolved = ["resolved", "closed"].includes(ticketStatus);
                  const isUnassigned = !ticket.assignedAdmin;

                  return (
                    <article
                      key={ticket._id}
                      className={`au-card au-ticket-card priority-${ticketPriority}`}
                    >
                      <div className="au-user">
                        <div className="au-avatar">
                          {ticket.subject?.charAt(0)?.toUpperCase() || "T"}
                        </div>

                        <div className="au-main">
                          <div className="au-top">
                            <div className="au-name">{ticket.subject}</div>
                            <span className="au-badge role-admin">
                              {ticket.category}
                            </span>
                            <span className={`au-badge status-${ticketStatus}`}>
                              {ticket.status}
                            </span>
                            <span className={`au-badge priority-badge priority-${ticketPriority}`}>
                              {ticket.priority}
                            </span>
                          </div>

                          <p className="au-ticket-preview">
                            {getTicketPreview(ticket)}
                          </p>

                          <div className="au-meta">
                            <span>{ticket.user?.name || "Unknown user"}</span>
                            <span>
                              Assigned:{" "}
                              {ticket.assignedAdmin?.name || "Not assigned"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="au-actions au-ticket-actions">
                        {!isSuperAdmin && isUnassigned && !isResolved && (
                          <button
                            className="au-btn soft"
                            disabled={workingId === ticket._id}
                            onClick={() => handleAssignToMe(ticket._id)}
                          >
                            Assign to Me
                          </button>
                        )}

                        {isSuperAdmin && !isResolved && (
                          <select
                            className="au-filter au-action-select"
                            defaultValue=""
                            disabled={workingId === ticket._id}
                            onChange={(e) =>
                              handleAssignOrReassign(ticket._id, e.target.value)
                            }
                          >
                            <option value="">
                              {isUnassigned ? "Assign to admin" : "Reassign"}
                            </option>

                            {availableAdmins.map((item) => (
                              <option key={item.admin._id} value={item.admin._id}>
                                {item.admin.name} ({item.activeTickets}/
                                {item.maxActiveTickets})
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="au-action-buttons">
                          {ticketStatus === "open" && !isResolved && (
                            <button
                              className="au-btn primary"
                              disabled={workingId === ticket._id}
                              onClick={() => updateStatus(ticket._id, "in_progress")}
                            >
                              Start
                            </button>
                          )}

                          {ticketStatus === "in_progress" && (
                            <button
                              className="au-btn success"
                              disabled={workingId === ticket._id}
                              onClick={() => updateStatus(ticket._id, "resolved")}
                            >
                              Resolve
                            </button>
                          )}

                          {isSuperAdmin && isResolved && (
                            <button
                              className="au-btn danger"
                              disabled={workingId === ticket._id}
                              onClick={() => handleDelete(ticket)}
                            >
                              Delete
                            </button>
                          )}

                          <Link to={`/admin/support/${ticket._id}`}>
                            <button className="au-btn primary">Open</button>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </main>

          <aside className="au-queue-panel">
            <section className="au-queue-card">
              <div className="au-eyebrow">Queue Intelligence</div>
              <h2>Next Best Action</h2>
              <p>{nextActionText}</p>

              <div className="au-queue-metrics">
                <div>
                  <span>High Priority</span>
                  <strong>{stats.highPriority}</strong>
                </div>

                <div>
                  <span>Open</span>
                  <strong>{stats.open}</strong>
                </div>

                <div>
                  <span>In Progress</span>
                  <strong>{stats.inProgress}</strong>
                </div>
              </div>
            </section>

            <section className="au-queue-card">
              <div className="au-eyebrow">Priority Mix</div>
              <h2>Ticket Pressure</h2>

              <div className="au-priority-mix">
                <div>
                  <span>High</span>
                  <strong>{stats.highPriority}</strong>
                </div>
                <div>
                  <span>Medium</span>
                  <strong>{stats.mediumPriority}</strong>
                </div>
                <div>
                  <span>Low</span>
                  <strong>{stats.lowPriority}</strong>
                </div>
              </div>
            </section>

            <section className="au-queue-card">
              <div className="au-eyebrow">Coverage</div>
              <h2>Available Admins</h2>

              <div className="au-admin-mini-list">
                {availableAdmins.length === 0 ? (
                  <p>No available admins right now.</p>
                ) : (
                  availableAdmins.slice(0, 5).map((item) => (
                    <div key={item.admin._id}>
                      <span>{item.admin.name?.charAt(0)?.toUpperCase() || "A"}</span>
                      <div>
                        <strong>{item.admin.name}</strong>
                        <small>
                          {item.activeTickets}/{item.maxActiveTickets} tickets
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}

export default AdminSupportTickets;