import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { API_BASE_URL } from "../api/axios";
import {
  getAdminDashboard,
  getAdminWorkload,
  updateMySupportAvailability,
} from "../api/adminApi";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function AdminDashboard() {
  const { user, setUser, logout } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(true);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const [adminForm, setAdminForm] = useState({
    name: "",
    publicId: "",
    avatar: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fetchStats = async () => {
    try {
      setLoading(true);

      const dashboardData = await getAdminDashboard();

      setStats(dashboardData?.stats || null);
      setCharts(dashboardData?.charts || null);

      try {
        const workloadData = await getAdminWorkload();
        setWorkload(workloadData || []);
      } catch (workloadError) {
        console.error("Failed to load admin workload:", workloadError);
        setWorkload([]);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to load admin dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProfile = async () => {
    try {
      const res = await api.get("/users/profile");

      setAdminForm({
        name: res.data?.name || "",
        publicId: res.data?.publicId || "",
        avatar: res.data?.avatar || "",
      });
    } catch (error) {
      console.error(error);

      setAdminForm({
        name: user?.name || "",
        publicId: user?.publicId || "",
        avatar: user?.avatar || "",
      });
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAdminProfile();
  }, []);

  const adminAvatarSrc = useMemo(() => {
    if (!adminForm.avatar) return "";
    if (adminForm.avatar.startsWith("http")) return adminForm.avatar;
    return `${API_BASE_URL}${adminForm.avatar}`;
  }, [adminForm.avatar]);

  const currentAdminWorkload = useMemo(() => {
    return workload.find((item) => String(item.admin?._id) === String(user?._id));
  }, [workload, user?._id]);

  const isAvailable = Boolean(currentAdminWorkload?.admin?.isSupportAvailable);

  const handleAdminFormChange = (e) => {
    setAdminForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const syncUpdatedUser = (updatedData) => {
    const updatedUser = {
      ...user,
      ...updatedData,
      token: user?.token,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);

      const formData = new FormData();
      formData.append("avatar", file);

      const res = await api.post("/users/profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAdminForm((prev) => ({
        ...prev,
        avatar: res.data?.avatar || prev.avatar,
      }));

      if (res.data?.user) {
        syncUpdatedUser(res.data.user);
      }

      showToast("Admin picture updated successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to upload picture", "error");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleAdminProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      setSavingProfile(true);

      const res = await api.put("/users/profile", {
        name: adminForm.name.trim(),
        publicId: adminForm.publicId.trim(),
        avatar: adminForm.avatar.trim(),
      });

      if (res.data?.user) {
        syncUpdatedUser(res.data.user);
      }

      showToast("Admin profile updated successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to update admin profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    try {
      setSavingPassword(true);

      await api.patch("/users/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordPanel(false);
      showToast("Password updated successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to update password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setSavingAvailability(true);

      const nextValue = !currentAdminWorkload?.admin?.isSupportAvailable;

      await updateMySupportAvailability(nextValue);

      showToast(
        nextValue ? "You are now available for tickets" : "You are now unavailable for tickets",
        "success"
      );

      fetchStats();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to update availability", "error");
    } finally {
      setSavingAvailability(false);
    }
  };

  const renderMiniChart = (items = [], label) => {
    const max = Math.max(...items.map((item) => item.count), 1);

    return (
      <div className="admin-chart-card">
        <div className="admin-chart-head">
          <span>{label}</span>
          <strong>{items.reduce((sum, item) => sum + item.count, 0)}</strong>
        </div>

        <div className="admin-chart-bars">
          {items.map((item) => (
            <div key={item.key} className="admin-chart-bar-wrap">
              <div
                className="admin-chart-bar"
                style={{
                  height: `${Math.max(8, (item.count / max) * 72)}px`,
                }}
                title={`${item.label}: ${item.count}`}
              />
              <span>{item.label.split(" ")[1] || item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page dashboard-page admin-profile-page">
      <section className="dashboard-shell dashboard-shell-final">
        <section className="admin-profile-hero">
          <div>
            <div className="section-eyebrow">Admin Control Center</div>
            <h1 className="dashboard-title">Platform Administration</h1>
            <p className="dashboard-subtitle">
              Manage your admin identity, platform health, support workload, and system activity
              from one clean workspace.
            </p>
          </div>

          <div className="admin-dashboard-hero-actions">
            <Link to="/admin/users">
              <button type="button">Manage Users</button>
            </Link>

            <Link to="/admin/support">
              <button type="button">Support Tickets</button>
            </Link>

            <Link to="/admin/audit">
              <button type="button">Audit Logs</button>
            </Link>
          </div>
        </section>

        <section className="admin-profile-editor">
          <div className="admin-profile-panel">
            <div className="admin-profile-header admin-profile-header-row">
              <div>
                <div className="section-eyebrow">Profile Settings</div>
                <h2 className="admin-profile-title">Admin Profile</h2>
                <p className="admin-profile-subtitle">
                  Keep your admin identity, security access, and support availability organized.
                </p>
              </div>

              <button
                type="button"
                className="admin-profile-collapse"
                onClick={() => setShowProfileCard((prev) => !prev)}
              >
                {showProfileCard ? "Collapse" : "Expand"}
              </button>
            </div>

            {showProfileCard && (
              <>
                <form className="admin-profile-layout" onSubmit={handleAdminProfileSubmit}>
                  <section className="admin-profile-box admin-profile-identity-box">
                    <div className="admin-profile-avatar-column">
                      <div className="admin-profile-avatar-preview">
                        {adminAvatarSrc ? (
                          <img src={adminAvatarSrc} alt={adminForm.name || "Admin"} />
                        ) : (
                          <span>{adminForm.name?.charAt(0)?.toUpperCase() || "A"}</span>
                        )}
                      </div>

                      <label className="admin-profile-upload-btn">
                        {uploadingAvatar ? "Uploading..." : "Change Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>

                    <div className="admin-profile-meta">
                      <span className="admin-admin-badge">
                        {user?.adminRole === "super_admin"
                          ? "Super Administrator"
                          : "Platform Administrator"}
                      </span>

                      <h3>{adminForm.name || "Platform Admin"}</h3>
                      <p>ID: {adminForm.publicId || "Not set"}</p>
                      <p>{user?.email || "No email available"}</p>
                    </div>
                  </section>

                  <section className="admin-profile-box">
                    <div className="admin-profile-box-head">
                      <div>
                        <h3 className="admin-profile-box-title">Profile Information</h3>
                        <p className="admin-profile-box-subtitle">
                          These details appear in your admin navbar and admin records.
                        </p>
                      </div>
                    </div>

                    <div className="admin-profile-fields">
                      <div className="admin-profile-group">
                        <label className="admin-profile-label">Admin name</label>
                        <input
                          className="admin-profile-input"
                          type="text"
                          name="name"
                          value={adminForm.name}
                          onChange={handleAdminFormChange}
                          placeholder="Enter admin name"
                          required
                        />
                      </div>

                      <div className="admin-profile-group">
                        <label className="admin-profile-label">Admin ID</label>
                        <input
                          className="admin-profile-input"
                          type="text"
                          name="publicId"
                          value={adminForm.publicId}
                          onChange={handleAdminFormChange}
                          placeholder="Enter 8 digit admin ID"
                          maxLength="8"
                          required
                        />
                      </div>

                      <div className="admin-profile-group full">
                        <label className="admin-profile-label">Picture URL</label>
                        <input
                          className="admin-profile-input"
                          type="text"
                          name="avatar"
                          value={adminForm.avatar}
                          onChange={handleAdminFormChange}
                          placeholder="Paste image URL or /uploads/image-name.jpg"
                        />
                      </div>
                    </div>

                    <div className="admin-profile-actions">
                      <button
                        type="submit"
                        className="admin-profile-save"
                        disabled={savingProfile}
                      >
                        {savingProfile ? "Saving..." : "Save Profile"}
                      </button>

                      <button
                        type="button"
                        className="admin-profile-secondary"
                        onClick={() => {
                          setShowPasswordPanel((prev) => !prev);
                          setShowSecurityPanel(false);
                        }}
                      >
                        Change Password
                      </button>

                      <button
                        type="button"
                        className="admin-profile-secondary"
                        onClick={() => {
                          setShowSecurityPanel((prev) => !prev);
                          setShowPasswordPanel(false);
                        }}
                      >
                        Security
                      </button>
                    </div>
                  </section>
                </form>

                <div className="admin-profile-note">
                  Upload a picture directly or use a stable image URL. Uploaded images are saved as{" "}
                  <strong>/uploads/filename</strong>.
                </div>

                {showPasswordPanel && (
                  <form className="admin-security-panel" onSubmit={handlePasswordSubmit}>
                    <div className="admin-security-panel-head">
                      <h3>Change Password</h3>
                      <p>Update your admin password securely.</p>
                    </div>

                    <div className="admin-profile-fields">
                      <div className="admin-profile-group">
                        <label className="admin-profile-label">Current password</label>
                        <input
                          className="admin-profile-input"
                          type="password"
                          name="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>

                      <div className="admin-profile-group">
                        <label className="admin-profile-label">New password</label>
                        <input
                          className="admin-profile-input"
                          type="password"
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>

                      <div className="admin-profile-group full">
                        <label className="admin-profile-label">Confirm new password</label>
                        <input
                          className="admin-profile-input"
                          type="password"
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="admin-profile-actions">
                      <button
                        className="admin-profile-save"
                        type="submit"
                        disabled={savingPassword}
                      >
                        {savingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                )}

                {showSecurityPanel && (
                  <div className="admin-security-panel">
                    <div className="admin-security-panel-head">
                      <h3>Security Settings</h3>
                      <p>Review your admin access and session status.</p>
                    </div>

                    <div className="admin-security-grid">
                      <div>
                        <span>Email</span>
                        <strong>{user?.email || "N/A"}</strong>
                      </div>

                      <div>
                        <span>Account type</span>
                        <strong>
                          {user?.adminRole === "super_admin" ? "Super Admin" : "Admin"}
                        </strong>
                      </div>

                      <div>
                        <span>Session</span>
                        <strong>Active</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="admin-profile-secondary admin-danger-button"
                      onClick={logout}
                    >
                      Logout from this device
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {loading ? (
          <div className="empty-state">Loading admin dashboard...</div>
        ) : (
          <>
            <section className="admin-overview-grid">
              <div className="admin-overview-card">
                <span>Users</span>
                <strong>{stats?.users || 0}</strong>
              </div>

              <div className="admin-overview-card">
                <span>Teach Listings</span>
                <strong>{stats?.teachListings || 0}</strong>
              </div>

              <div className="admin-overview-card">
                <span>Learn Listings</span>
                <strong>{stats?.learnListings || 0}</strong>
              </div>

              <div className="admin-overview-card">
                <span>Exchanges</span>
                <strong>{stats?.exchanges || 0}</strong>
              </div>

              <div className="admin-overview-card highlight">
                <span>Open Tickets</span>
                <strong>{stats?.openTickets || 0}</strong>
              </div>
            </section>

            <section className="admin-workload-section">
              <div className="admin-section-head">
                <div>
                  <div className="section-eyebrow">Workload</div>
                  <h2>Admin Availability</h2>
                  <p>See which admins can take more support tickets.</p>
                </div>

                <button
                  type="button"
                  className="admin-profile-secondary"
                  disabled={savingAvailability}
                  onClick={handleToggleAvailability}
                >
                  {savingAvailability
                    ? "Updating..."
                    : isAvailable
                    ? "Set Unavailable"
                    : "Set Available"}
                </button>
              </div>

              {workload.length === 0 ? (
                <div className="au-empty">Admin workload unavailable.</div>
              ) : (
                <section className="admin-workload-list">
                  {workload.map((item) => (
                    <article key={item.admin._id} className="admin-workload-card">
                      <div className="admin-workload-avatar">
                        {item.admin.name?.charAt(0)?.toUpperCase() || "A"}
                      </div>

                      <div className="admin-workload-content">
                        <div className="admin-workload-top">
                          <strong>{item.admin.name}</strong>

                          <span className="au-badge role-admin">
                            {item.admin.adminRole === "super_admin" ? "Super Admin" : "Admin"}
                          </span>

                          <span
  className={`au-badge ${
    item.admin?.isSupportAvailable ? "role-tutor" : "status-blocked"
  }`}
>
  {item.admin?.isSupportAvailable ? "Available" : "Unavailable"}
</span>
                        </div>

                        <div className="admin-workload-meta">
                          <span>{item.admin.email}</span>
                          <span>
                            Tickets: {item.activeTickets}/{item.maxActiveTickets}
                          </span>
                          <span>Warnings: {item.warningsCount}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </section>

            <section className="admin-analytics-section">
              <div className="admin-section-head">
                <div>
                  <div className="section-eyebrow">Analytics</div>
                  <h2>Platform Activity</h2>
                  <p>Quick seven-day view of recent platform movement.</p>
                </div>
              </div>

              <section className="admin-chart-grid">
                {renderMiniChart(charts?.users || [], "New Users")}
                {renderMiniChart(charts?.tickets || [], "Support Tickets")}
                {renderMiniChart(charts?.teachListings || [], "Teach Listings")}
                {renderMiniChart(charts?.learnListings || [], "Learn Listings")}
                {renderMiniChart(charts?.exchanges || [], "Skill Exchanges")}
              </section>
            </section>
          </>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;