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

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const res = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      if (!res.data) {
        showToast("Login failed", "error");
        return;
      }

      const authData = {
        ...res.data,
        token: res.data.token,
      };

      localStorage.setItem("user", JSON.stringify(authData));
      localStorage.setItem("token", authData.token);

      login(authData);
      showToast("Login successful", "success");

      if (authData.isAdmin) {
        window.location.replace("/admin");
      } else {
        window.location.replace("/dashboard");
      }
    } catch (error) {
      console.error(error);

      const message = error.response?.data?.message || "Login failed";

      if (message.toLowerCase().includes("blocked")) {
        showToast(
          "Your account has been blocked. Please contact support.",
          "error",
          6000
        );

        navigate("/support/new", {
          state: {
            email: formData.email.trim(),
            category: "login",
            subject: "Blocked account support request",
          },
        });

        return;
      }

      if (
        error.response?.status === 409 ||
        error.response?.data?.message ===
          "This account is already logged in on another device"
      ) {
        showToast("This account is already logged in on another device", "error");
      } else {
        showToast(message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell auth-shell-enhanced">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />
      <div className="auth-ambient auth-ambient-three" />

      <div className="auth-card auth-card-enhanced auth-login-card">
        <div className="auth-card-glow" />

        <div className="auth-header-block">
          <div className="auth-eyebrow">PeerLearn Access</div>

          <h1>Welcome back</h1>

          <div className="auth-subtitle">
            Sign in to manage your listings, chats, sessions, reviews, or admin tools.
          </div>
        </div>

        <form className="form-grid auth-form-grid" onSubmit={handleSubmit}>
          <div className="auth-input-group auth-floating-group">
            <label className="auth-label">Email address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-input-group auth-floating-group">
            <label className="auth-label">Password</label>

            <div className="auth-password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.73-2.06 2-3.83 3.6-5.16" />
                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                    <path d="M9.88 4.24A10.54 10.54 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="actions auth-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? (
                <span className="auth-button-loading">
                  <span className="auth-spinner" />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </div>
        </form>

        <div className="auth-switch-text">
          Don’t have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;