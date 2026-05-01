import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });
      if (!res.data) { showToast("Login failed", "error"); return; }
      const authData = { ...res.data, token: res.data.token };
      localStorage.setItem("user", JSON.stringify(authData));
      localStorage.setItem("token", authData.token);
      login(authData);
      showToast("Login successful", "success");
      window.location.replace(authData.isAdmin ? "/admin" : "/dashboard");
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      if (message.toLowerCase().includes("blocked")) {
        showToast("Your account has been blocked. Please contact support.", "error", 6000);
        navigate("/support/new", {
          state: { email: formData.email.trim(), category: "login", subject: "Blocked account support request" },
        });
        return;
      }
      if (error.response?.status === 409) {
        showToast("This account is already logged in on another device", "error");
      } else {
        showToast(message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="au-shell">
      <div className="au-blob au-blob-1" />
      <div className="au-blob au-blob-2" />
      <div className="au-blob au-blob-3" />

      <div className="au-login-card">

        {/* brand */}
        <div className="au-login-brand">
          <Link to="/" className="au-reg-brand">
            Peer<span className="au-accent">Learn</span>
          </Link>
        </div>

        {/* header */}
        <div className="au-login-head">
          <span className="au-eyebrow">Welcome back</span>
          <h1 className="au-login-title">Sign in to PeerLearn</h1>
          <p className="au-login-sub">
            Manage your listings, chats, sessions, and reviews.
          </p>
        </div>

        {/* form */}
        <form className="au-login-form" onSubmit={handleSubmit} noValidate>

          <div className="au-field">
            <label htmlFor="l-email">Email address</label>
            <div className="au-input-wrap">
              <span className="au-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </span>
              <input id="l-email" type="email" name="email" placeholder="you@example.com"
                value={formData.email} onChange={handleChange} required autoComplete="email" />
            </div>
          </div>

          <div className="au-field">
            <label htmlFor="l-pw">Password</label>
            <div className="au-input-wrap">
              <span className="au-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input id="l-pw" type={showPassword ? "text" : "password"} name="password"
                placeholder="Enter your password"
                value={formData.password} onChange={handleChange}
                required autoComplete="current-password" />
              <button type="button" className="au-eye" onClick={() => setShowPassword(p => !p)}
                tabIndex={-1} aria-label="Toggle password">
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.73-2.06 2-3.83 3.6-5.16"/>
                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"/>
                    <path d="M9.88 4.24A10.54 10.54 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <path d="M1 1l22 22"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="au-submit" disabled={submitting}>
            {submitting ? (
              <><span className="au-spinner" /> Signing in…</>
            ) : (
              <>
                Sign In
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="au-switch">
          Don't have an account? <Link to="/register">Create one free →</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;