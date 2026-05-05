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
    };
  }, [tickets, activeUser?._id]);

  const availableAdmins = useMemo(() => {
    return admins.filter((item) => item.available);
  }, [admins]);

  const visibleTickets = useMemo(() => {
    if (ticketView === "assigned_to_me") {
      return tickets.filter(
        (ticket) => String(ticket.assignedAdmin?._id) === String(activeUser?._id)
      );
    }

    if (ticketView === "unassigned") {
      return tickets.filter((ticket) => !ticket.assignedAdmin);
    }

    return tickets;
  }, [tickets, ticketView, activeUser?._id]);

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

  return (
    <div className="page">
      <div className="au-page">
        <section className="au-header">
          <div className="au-eyebrow">Admin</div>
          <h1 className="au-title">Support Tickets</h1>
          <p className="au-subtitle">
            View all tickets, your assigned tickets, and unassigned tickets from one simple page.
          </p>
        </section>

        <section className="au-stats">
          <div className="au-stat">
            <div className="au-stat-label">Total</div>
            <div className="au-stat-value">{stats.total}</div>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Assigned to Me</div>
            <div className="au-stat-value">{stats.assignedToMe}</div>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Unassigned</div>
            <div className="au-stat-value">{stats.unassigned}</div>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Resolved</div>
            <div className="au-stat-value">{stats.resolved}</div>
          </div>
        </section>

        <section className="au-toolbar">
          <button
            type="button"
            className={`au-btn ${ticketView === "all" ? "unblock" : ""}`}
            onClick={() => setTicketView("all")}
          >
            All Tickets
          </button>

          <button
            type="button"
            className={`au-btn ${ticketView === "assigned_to_me" ? "unblock" : ""}`}
            onClick={() => setTicketView("assigned_to_me")}
          >
            Assigned to Me
          </button>

          <button
            type="button"
            className={`au-btn ${ticketView === "unassigned" ? "unblock" : ""}`}
            onClick={() => setTicketView("unassigned")}
          >
            Unassigned
          </button>
        </section>

        <section className="au-toolbar">
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
        </section>

        {loading ? (
          <div className="au-empty">Loading tickets...</div>
        ) : visibleTickets.length === 0 ? (
          <div className="au-empty">No tickets found in this view.</div>
        ) : (
          <section className="au-list">
            {visibleTickets.map((ticket) => {
              const ticketStatus = String(ticket.status || "").toLowerCase();
              const isResolved = ["resolved", "closed"].includes(ticketStatus);
              const isUnassigned = !ticket.assignedAdmin;

              return (
                <article key={ticket._id} className="au-card">
                  <div className="au-user">
                    <div className="au-avatar">
                      {ticket.subject?.charAt(0)?.toUpperCase() || "T"}
                    </div>

                    <div className="au-main">
                      <div className="au-top">
                        <div className="au-name">{ticket.subject}</div>
                        <span className="au-badge role-admin">{ticket.category}</span>
                        <span className="au-badge">{ticket.status}</span>
                      </div>

                      <div className="au-meta">
                        <span>{ticket.user?.name || "Unknown user"}</span>
                        <span>{ticket.priority} priority</span>
                        <span>
                          Assigned: {ticket.assignedAdmin?.name || "Not assigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="au-actions">
                    {!isSuperAdmin && isUnassigned && !isResolved && (
                      <button
                        className="au-btn logout"
                        disabled={workingId === ticket._id}
                        onClick={() => handleAssignToMe(ticket._id)}
                      >
                        Assign to Me
                      </button>
                    )}

                    {isSuperAdmin && !isResolved && (
                      <select
                        className="au-filter"
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
                            {item.admin.name} ({item.activeTickets}/{item.maxActiveTickets})
                          </option>
                        ))}
                      </select>
                    )}

                    {ticketStatus === "open" && !isResolved && (
                      <button
                        className="au-btn block"
                        disabled={workingId === ticket._id}
                        onClick={() => updateStatus(ticket._id, "in_progress")}
                      >
                        Start
                      </button>
                    )}

                    {ticketStatus === "in_progress" && (
                      <button
                        className="au-btn unblock"
                        disabled={workingId === ticket._id}
                        onClick={() => updateStatus(ticket._id, "resolved")}
                      >
                        Resolve
                      </button>
                    )}

                    {isSuperAdmin && isResolved && (
                      <button
                        className="au-btn block"
                        disabled={workingId === ticket._id}
                        onClick={() => handleDelete(ticket)}
                      >
                        Delete
                      </button>
                    )}

                    <Link to={`/admin/support/${ticket._id}`}>
                      <button className="au-btn">Open</button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminSupportTickets;