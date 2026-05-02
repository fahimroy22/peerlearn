import { useEffect, useState } from "react";
import { deleteAuditLog, getAuditLogs } from "../api/adminApi";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function AdminAuditLogs() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isSuperAdmin = user?.isAdmin && user?.adminRole === "super_admin";

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs({ search });
      setLogs(data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (log) => {
    const confirmed = window.confirm(
      "Delete this audit log? Only super admin can do this."
    );

    if (!confirmed) return;

    try {
      setWorkingId(log._id);
      await deleteAuditLog(log._id);
      showToast("Audit log deleted", "success");
      fetchLogs();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to delete audit log", "error");
    } finally {
      setWorkingId("");
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="page">
      <div className="audit-page">
        <section className="audit-header">
          <div className="section-eyebrow">Admin</div>
          <h1 className="audit-title">Audit Logs</h1>
          <p className="audit-subtitle">
            Track admin actions including user moderation, listing changes, ticket updates,
            warnings, and account controls.
          </p>
        </section>

        <section className="audit-toolbar">
          <input
            type="text"
            placeholder="Search logs by action, target, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </section>

        {loading ? (
          <div className="audit-empty">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">No audit logs found.</div>
        ) : (
          <section className="audit-list">
            {logs.map((log) => (
              <article key={log._id} className="audit-card">
                <div className="audit-icon">
                  {log.action?.charAt(0)?.toUpperCase() || "A"}
                </div>

                <div className="audit-main">
                  <div className="audit-card-top">
                    <h3>{log.action}</h3>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>

                  <div className="audit-meta">
                    <span>Admin: {log.admin?.name || "Unknown admin"}</span>
                    <span>Target: {log.targetLabel || log.targetType || "N/A"}</span>
                    {log.targetType && <span>Type: {log.targetType}</span>}
                  </div>

                  {log.details && <p className="audit-details">{log.details}</p>}

                  {log.snapshot && Object.keys(log.snapshot).length > 0 && (
                    <details className="audit-details">
                      <summary>View saved data</summary>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>
                        {JSON.stringify(log.snapshot, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="au-actions">
                    <button
                      type="button"
                      className="au-btn block"
                      disabled={workingId === log._id}
                      onClick={() => handleDelete(log)}
                    >
                      {workingId === log._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminAuditLogs;