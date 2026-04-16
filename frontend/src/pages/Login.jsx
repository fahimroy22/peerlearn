import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
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
      window.location.replace("/dashboard");
    } catch (error) {
      console.error(error);

      if (
        error.response?.status === 409 ||
        error.response?.data?.message ===
          "This account is already logged in on another device"
      ) {
        showToast("This account is already logged in on another device", "error");
      } else {
        showToast(error.response?.data?.message || "Login failed", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell auth-shell-enhanced">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />

      <div className="auth-card auth-card-enhanced">
        <div className="auth-header-block">
          <div className="auth-eyebrow">PeerLearn Access</div>
          <h1>Welcome back</h1>
          <div className="auth-subtitle">
            Sign in to manage your listings, chats, sessions, and reviews.
          </div>
        </div>

        <form className="form-grid auth-form-grid" onSubmit={handleSubmit}>
          <div className="auth-input-group">
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

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="actions auth-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Logging in..." : "Login"}
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