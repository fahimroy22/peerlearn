import { useEffect, useMemo, useState } from "react";
import {
  blockUser,
  forceLogoutUser,
  getAllUsers,
  unblockUser,
} from "../api/adminApi";
import useToast from "../context/useToast";

function AdminUsers() {
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const data = await getAllUsers({
        search,
        role,
        status,
      });

      setUsers(data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [search, role, status]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((item) => item.isAdmin).length,
      tutors: users.filter((item) => !item.isAdmin && item.role === "tutor").length,
      learners: users.filter((item) => !item.isAdmin && item.role === "learner").length,
      blocked: users.filter((item) => item.accountStatus === "blocked").length,
    };
  }, [users]);

  const handleBlock = async (targetUser) => {
    const reason = window.prompt(
      `Why are you blocking ${targetUser.name}?`,
      "Policy violation or suspicious activity"
    );

    if (reason === null) return;

    try {
      setWorkingId(targetUser._id);
      await blockUser(targetUser._id, reason);
      showToast("User blocked and logged out", "success");
      fetchUsers();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to block user", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleUnblock = async (targetUser) => {
    try {
      setWorkingId(targetUser._id);
      await unblockUser(targetUser._id);
      showToast("User unblocked", "success");
      fetchUsers();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to unblock user", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleForceLogout = async (targetUser) => {
    try {
      setWorkingId(targetUser._id);
      await forceLogoutUser(targetUser._id);
      showToast("User logged out", "success");
      fetchUsers();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to logout user", "error");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <div className="page">
      <div className="au-page">
        <section className="au-header">
          <div className="au-eyebrow">Admin</div>
          <h1 className="au-title">User Management</h1>
          <p className="au-subtitle">
            Monitor users, moderate accounts, block unsafe users, and force logout active sessions.
          </p>
        </section>

        <section className="au-stats">
          <div className="au-stat">
            <div className="au-stat-label">Total Users</div>
            <div className="au-stat-value">{stats.total}</div>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Admins</div>
            <div className="au-stat-value">{stats.admins}</div>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Tutors</div>
            <div className="au-stat-value">{stats.tutors}</div>
          </div>

          <div className="au-stat">
            <div className="au-stat-label">Blocked</div>
            <div className="au-stat-value">{stats.blocked}</div>
          </div>
        </section>

        <section className="au-toolbar">
          <input
            className="au-search"
            type="text"
            placeholder="Search by name, email, or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="au-filter"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="admin">Admins</option>
            <option value="tutor">Tutors</option>
            <option value="learner">Learners</option>
          </select>

          <select
            className="au-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </section>

        {loading ? (
          <div className="au-empty">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="au-empty">No users found.</div>
        ) : (
          <section className="au-list">
            {users.map((item) => {
              const isBlocked = item.accountStatus === "blocked";
              const roleClass = item.isAdmin
                ? "role-admin"
                : item.role === "tutor"
                ? "role-tutor"
                : "role-learner";

              return (
                <article key={item._id} className="au-card">
                  <div className="au-user">
                    <div className="au-avatar">
                      {item.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="au-main">
                      <div className="au-top">
                        <div className="au-name">{item.name || "Unnamed User"}</div>

                        <span className={`au-badge ${roleClass}`}>
                          {item.isAdmin ? "Admin" : item.role}
                        </span>

                        {isBlocked && (
                          <span className="au-badge status-blocked">Blocked</span>
                        )}
                      </div>

                      <div className="au-meta">
                        <span>{item.email || "No email"}</span>
                        <span>{item.publicId || "No ID"}</span>
                        <span>{item.department || "No department"}</span>
                        <span>{item.semester ? `Semester ${item.semester}` : "No semester"}</span>
                      </div>

                      <div className="au-health">
                        <span className="au-pill">
                          Status: {item.accountStatus || "active"}
                        </span>

                        <span className="au-pill">
                          Session: {item.activeSessionToken ? "Active" : "None"}
                        </span>

                        {item.blockedReason && (
                          <span className="au-pill">
                            Reason: {item.blockedReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="au-actions">
                    {!item.isAdmin ? (
                      <>
                        {isBlocked ? (
                          <button
                            type="button"
                            className="au-btn unblock"
                            onClick={() => handleUnblock(item)}
                            disabled={workingId === item._id}
                          >
                            {workingId === item._id ? "Working..." : "Unblock"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="au-btn block"
                            onClick={() => handleBlock(item)}
                            disabled={workingId === item._id}
                          >
                            {workingId === item._id ? "Working..." : "Block"}
                          </button>
                        )}

                        <button
                          type="button"
                          className="au-btn logout"
                          onClick={() => handleForceLogout(item)}
                          disabled={workingId === item._id || !item.activeSessionToken}
                        >
                          Force Logout
                        </button>
                      </>
                    ) : (
                      <span className="au-pill">Protected Admin</span>
                    )}
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

export default AdminUsers;