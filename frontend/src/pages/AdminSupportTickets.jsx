import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

  const isSuperAdmin = user?.isAdmin && user?.adminRole === "super_admin";

  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

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
    const timer = setTimeout(fetchTickets, 250);
    return () => clearTimeout(timer);
  }, [status, priority, category, search]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((item) => item.status === "open").length,
      inProgress: tickets.filter((item) => item.status === "in_progress").length,
      resolved: tickets.filter((item) => item.status === "resolved").length,
    };
  }, [tickets]);

  const handleAssign = async (id) => {
    try {
      setWorkingId(id);
      await assignSupportTicket(id);
      showToast("Ticket assigned", "success");
      fetchTickets();
      fetchAdmins();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed assigning ticket", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleReassign = async (ticketId, adminId) => {
    if (!adminId) return;

    try {
      setWorkingId(ticketId);
      await reassignSupportTicket(ticketId, adminId);
      showToast("Ticket reassigned", "success");
      fetchTickets();
      fetchAdmins();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed reassigning ticket", "error");
    } finally {
      setWorkingId("");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      setWorkingId(id);
      await updateSupportTicketStatus(id, newStatus);
      showToast("Ticket updated", "success");
      fetchTickets();
      fetchAdmins();
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
      fetchTickets();
      fetchAdmins();
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
            Auto-assigned tickets, simple status actions, and super admin reassignment.
          </p>
        </section>

        <section className="au-stats">
          <div className="au-stat">
            <div className="au-stat-label">Total</div>
            <div className="au-stat-value">{stats.total}</div>
          </div>
          <div className="au-stat">
            <div className="au-stat-label">Open</div>
            <div className="au-stat-value">{stats.open}</div>
          </div>
          <div className="au-stat">
            <div className="au-stat-label">In Progress</div>
            <div className="au-stat-value">{stats.inProgress}</div>
          </div>
          <div className="au-stat">
            <div className="au-stat-label">Resolved</div>
            <div className="au-stat-value">{stats.resolved}</div>
          </div>
        </section>

        <section className="au-toolbar">
          <input
            className="au-search"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select className="au-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select className="au-filter" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select className="au-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
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
        ) : tickets.length === 0 ? (
          <div className="au-empty">No tickets found.</div>
        ) : (
          <section className="au-list">
            {tickets.map((ticket) => {
              const isResolved = ["resolved", "closed"].includes(ticket.status);

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
                    {!ticket.assignedAdmin && (
                      <button
                        className="au-btn logout"
                        disabled={workingId === ticket._id}
                        onClick={() => handleAssign(ticket._id)}
                      >
                        Assign to Me
                      </button>
                    )}

                    {ticket.status === "open" && (
                      <button
                        className="au-btn block"
                        disabled={workingId === ticket._id}
                        onClick={() => updateStatus(ticket._id, "in_progress")}
                      >
                        Start
                      </button>
                    )}

                    {ticket.status === "in_progress" && (
                      <button
                        className="au-btn unblock"
                        disabled={workingId === ticket._id}
                        onClick={() => updateStatus(ticket._id, "resolved")}
                      >
                        Resolve
                      </button>
                    )}

                    {isSuperAdmin && (
                      <select
                        className="au-filter"
                        defaultValue=""
                        disabled={workingId === ticket._id}
                        onChange={(e) => handleReassign(ticket._id, e.target.value)}
                      >
                        <option value="">Reassign</option>
                        {admins.map((item) => (
                          <option
                            key={item.admin._id}
                            value={item.admin._id}
                            disabled={!item.available}
                          >
                            {item.admin.name} ({item.activeTickets}/{item.maxActiveTickets})
                          </option>
                        ))}
                      </select>
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