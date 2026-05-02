import { useEffect, useMemo, useState } from "react";
import {
  blockUser,
  demoteAdmin,
  forceLogoutUser,
  getAllUsers,
  promoteToAdmin,
  unblockUser,
  warnAdmin,
} from "../api/adminApi";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function AdminUsers() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isSuperAdmin = user?.isAdmin && user?.adminRole === "super_admin";

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
      superAdmins: users.filter((item) => item.adminRole === "super_admin").length,
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
      showToast("Account blocked and logged out", "success");
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to block account", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleUnblock = async (targetUser) => {
    try {
      setWorkingId(targetUser._id);
      await unblockUser(targetUser._id);
      showToast("Account unblocked", "success");
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to unblock account", "error");
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
      showToast(error.response?.data?.message || "Failed to logout user", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handlePromote = async (targetUser) => {
    const confirmed = window.confirm(`Promote ${targetUser.name} to admin?`);
    if (!confirmed) return;

    try {
      setWorkingId(targetUser._id);
      await promoteToAdmin(targetUser._id);
      showToast("User promoted to admin", "success");
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to promote user", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleDemote = async (targetUser) => {
    const confirmed = window.confirm(`Remove admin access from ${targetUser.name}?`);
    if (!confirmed) return;

    try {
      setWorkingId(targetUser._id);
      await demoteAdmin(targetUser._id);
      showToast("Admin demoted", "success");
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to demote admin", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleWarn = async (targetUser) => {
    const reason = window.prompt(
      `Warning reason for ${targetUser.name}`,
      "Please follow admin guidelines."
    );

    if (!reason?.trim()) return;

    try {
      setWorkingId(targetUser._id);
      await warnAdmin(targetUser._id, reason.trim());
      showToast("Warning sent", "success");
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to warn admin", "error");
    } finally {
      setWorkingId("");
    }
  };

  const getRoleLabel = (item) => {
    if (item.adminRole === "super_admin") return "Super Admin";
    if (item.isAdmin) return "Admin";
    return item.role;
  };

  const getRoleClass = (item) => {
    if (item.adminRole === "super_admin") return "role-admin";
    if (item.isAdmin) return "role-admin";
    if (item.role === "tutor") return "role-tutor";
    return "role-learner";
  };

  return (
    <div className="page">
      <div className="au-page">
        <section className="au-header">
          <div className="au-eyebrow">Admin</div>
          <h1 className="au-title">User Management</h1>
          <p className="au-subtitle">
            Manage users, moderate accounts, and control admin access from one simple page.
          </p>
        </section>

        <section className="au-stats">
          <div className="au-stat">
            <div className="au-stat-label">Total</div>
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
            <option value="super_admin">Super Admins</option>
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
              const isSelf = String(item._id) === String(user?._id);
              const isProtectedSuperAdmin = item.adminRole === "super_admin";
              const canModerate =
                !isSelf &&
                !isProtectedSuperAdmin &&
                (!item.isAdmin || isSuperAdmin);

              return (
                <article key={item._id} className="au-card">
                  <div className="au-user">
                    <div className="au-avatar">
                      {item.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="au-main">
                      <div className="au-top">
                        <div className="au-name">{item.name || "Unnamed User"}</div>

                        <span className={`au-badge ${getRoleClass(item)}`}>
                          {getRoleLabel(item)}
                        </span>

                        {isBlocked && (
                          <span className="au-badge status-blocked">Blocked</span>
                        )}

                        {item.warnings?.length > 0 && (
                          <span className="au-badge">
                            {item.warnings.length} warning{item.warnings.length > 1 ? "s" : ""}
                          </span>
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

                        {item.isAdmin && (
                          <span className="au-pill">
                            Support: {item.isSupportAvailable ? "Available" : "Unavailable"}
                          </span>
                        )}

                        {item.blockedReason && (
                          <span className="au-pill">
                            Reason: {item.blockedReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="au-actions">
                    {canModerate && (
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
                    )}

                    {isSuperAdmin && !item.isAdmin && (
                      <button
                        type="button"
                        className="au-btn unblock"
                        onClick={() => handlePromote(item)}
                        disabled={workingId === item._id}
                      >
                        Make Admin
                      </button>
                    )}

                    {isSuperAdmin && item.isAdmin && item.adminRole === "admin" && (
                      <>
                        <button
                          type="button"
                          className="au-btn logout"
                          onClick={() => handleWarn(item)}
                          disabled={workingId === item._id}
                        >
                          Warn
                        </button>

                        <button
                          type="button"
                          className="au-btn block"
                          onClick={() => handleDemote(item)}
                          disabled={workingId === item._id}
                        >
                          Remove Admin
                        </button>
                      </>
                    )}

                    {!canModerate && (
                      <span className="au-pill">
                        {isSelf ? "Current account" : "Protected"}
                      </span>
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