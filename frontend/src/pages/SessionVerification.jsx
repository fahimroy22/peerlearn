import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

function SessionVerification() {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}/verify`);
        setVerification(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to verify this session token"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [sessionId]);

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: "900px", margin: "40px auto" }}>
          <h1 className="page-title">Verifying Session</h1>
          <p className="listing-page-subtitle">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error || !verification?.valid || !verification?.session) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: "900px", margin: "40px auto" }}>
          <div className="badge badge-red" style={{ marginBottom: "16px" }}>
            Invalid
          </div>
          <h1 className="page-title">Session Verification Failed</h1>
          <p className="listing-page-subtitle">
            {error || verification?.message || "This session token could not be verified."}
          </p>
        </div>
      </div>
    );
  }

  const session = verification.session;
  const isOnline = session.deliveryMode === "online";

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "980px", margin: "40px auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <span className="badge badge-green">Verified</span>
          <span className="badge badge-blue">{session.sessionType}</span>
          <span className="badge badge-yellow">{session.deliveryMode}</span>
          <span className="badge badge-blue">{session.status}</span>
        </div>

        <h1 className="page-title" style={{ marginBottom: "8px" }}>
          Session Verification
        </h1>
        <p className="listing-page-subtitle" style={{ marginBottom: "24px" }}>
          This QR code belongs to a valid PeerLearn session confirmation token.
        </p>

        <div className="session-summary-strip" style={{ marginBottom: "20px" }}>
          <div className="session-summary-item">
            <span className="session-summary-label">Skill</span>
            <strong className="session-summary-value">{session.skill}</strong>
          </div>

          <div className="session-summary-item">
            <span className="session-summary-label">Start</span>
            <strong className="session-summary-value">
              {formatDateTime(session.startTime)}
            </strong>
          </div>

          <div className="session-summary-item">
            <span className="session-summary-label">
              {isOnline ? "Meeting" : "Location"}
            </span>
            <strong className="session-summary-value">
              {isOnline ? session.roomUrl || "Unavailable" : session.location || "Unavailable"}
            </strong>
          </div>
        </div>

        <div className="session-meta-grid">
          <div className="session-meta-card">
            <span className="session-meta-title">Session Details</span>

            <div className="session-meta-row">
              <span>Session ID</span>
              <span>{session._id}</span>
            </div>

            <div className="session-meta-row">
              <span>Category</span>
              <span>{session.sessionType}</span>
            </div>

            <div className="session-meta-row">
              <span>Status</span>
              <span>{session.status}</span>
            </div>

            <div className="session-meta-row">
              <span>Delivery Mode</span>
              <span>{session.deliveryMode}</span>
            </div>

            <div className="session-meta-row">
              <span>Start</span>
              <span>{formatDateTime(session.startTime)}</span>
            </div>

            <div className="session-meta-row">
              <span>End</span>
              <span>{formatDateTime(session.endTime)}</span>
            </div>

            <div className="session-meta-row">
              <span>Created At</span>
              <span>{formatDateTime(session.createdAt)}</span>
            </div>
          </div>

          <div className="session-meta-card">
            <span className="session-meta-title">Tutor Information</span>

            <div className="session-meta-row">
              <span>Name</span>
              <span>{session.tutor?.name || "N/A"}</span>
            </div>

            <div className="session-meta-row">
              <span>Email</span>
              <span>{session.tutor?.email || "N/A"}</span>
            </div>

            <div className="session-meta-row">
              <span>User ID</span>
              <span>{session.tutor?.publicId || "N/A"}</span>
            </div>
          </div>

          <div className="session-meta-card">
            <span className="session-meta-title">Learner Information</span>

            <div className="session-meta-row">
              <span>Name</span>
              <span>{session.learner?.name || "N/A"}</span>
            </div>

            <div className="session-meta-row">
              <span>Email</span>
              <span>{session.learner?.email || "N/A"}</span>
            </div>

            <div className="session-meta-row">
              <span>User ID</span>
              <span>{session.learner?.publicId || "N/A"}</span>
            </div>
          </div>

          {session.sessionType === "exchange" && session.exchange && (
            <div className="session-meta-card">
              <span className="session-meta-title">Exchange Details</span>

              <div className="session-meta-row">
                <span>Offer Skill</span>
                <span>{session.exchange.offerSkill || "N/A"}</span>
              </div>

              <div className="session-meta-row">
                <span>Wanted Skill</span>
                <span>{session.exchange.wantSkill || "N/A"}</span>
              </div>

              <div className="session-meta-row">
                <span>Owner</span>
                <span>{session.exchange.owner || "N/A"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionVerification;