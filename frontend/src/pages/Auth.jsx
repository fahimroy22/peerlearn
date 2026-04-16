import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState("email"); // email | login | register
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    semester: "",
    role: "learner",
  });

  const stepTitle = useMemo(() => {
    if (step === "login") return "Welcome back";
    if (step === "register") return "Create your account";
    return "Get started";
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === "login") {
      return "We found your account. Enter your password to continue.";
    }
    if (step === "register") {
      return "No account found for this email. Complete the details below to join PeerLearn.";
    }
    return "Enter your email to continue. We’ll guide you to login or registration automatically.";
  }, [step]);

  const progressLabel = useMemo(() => {
    if (step === "email") return "Step 1 of 2";
    return "Step 2 of 2";
  }, [step]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCheckEmail = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      showToast("Please enter your email", "error");
      return;
    }

    try {
      setCheckingEmail(true);

      const res = await api.post("/auth/check-email", {
        email: formData.email.trim(),
      });

      if (res.data?.exists) {
        setStep("login");
        showToast("Account found. Please enter your password.", "success");
      } else {
        setStep("register");
        showToast("No account found. Please complete registration.", "info");
      }
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to check email", "error");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim()) {
      showToast("Email and password are required", "error");
      return;
    }

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
      showToast(error.response?.data?.message || "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      showToast("Name, email and password are required", "error");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        department: formData.department,
        semester: formData.semester,
        role: formData.role,
      });

      login(res.data);
      showToast("Registration successful", "success");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Registration failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setFormData((prev) => ({
      ...prev,
      password: "",
      name: step === "register" ? prev.name : "",
      department: step === "register" ? prev.department : "",
      semester: step === "register" ? prev.semester : "",
      role: step === "register" ? prev.role : "learner",
    }));
  };

  return (
    <div className="auth-shell auth-shell-enhanced">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />

      <div className="auth-card auth-card-enhanced">
        <div className="auth-progress-row">
          <span className="auth-progress-pill">{progressLabel}</span>
          {(step === "login" || step === "register") && (
            <button type="button" className="auth-back-link" onClick={handleBack}>
              Change email
            </button>
          )}
        </div>

        <div className="auth-header-block">
          <div className="auth-eyebrow">PeerLearn Access</div>
          <h1>{stepTitle}</h1>
          <div className="auth-subtitle">{stepSubtitle}</div>
        </div>

        <div className="auth-mode-indicator">
          <div className={`auth-mode-chip ${step === "email" ? "active" : ""}`}>Email</div>
          <div className={`auth-mode-chip ${step === "login" ? "active" : ""}`}>Login</div>
          <div className={`auth-mode-chip ${step === "register" ? "active" : ""}`}>Register</div>
        </div>

        {step === "email" && (
          <form className="form-grid auth-form-grid" onSubmit={handleCheckEmail}>
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

            <div className="actions auth-actions">
              <button type="submit" disabled={checkingEmail}>
                {checkingEmail ? "Checking..." : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step === "login" && (
          <form className="form-grid auth-form-grid" onSubmit={handleLogin}>
            <div className="auth-summary-box">
              <span className="auth-summary-label">Email</span>
              <strong>{formData.email}</strong>
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
        )}

        {step === "register" && (
          <form className="form-grid auth-form-grid" onSubmit={handleRegister}>
            <div className="auth-summary-box">
              <span className="auth-summary-label">Email</span>
              <strong>{formData.email}</strong>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Full name</label>
              <input
                type="text"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-2">
              <div className="auth-input-group">
                <label className="auth-label">Department</label>
                <input
                  type="text"
                  name="department"
                  placeholder="Department"
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Semester</label>
                <input
                  type="text"
                  name="semester"
                  placeholder="Semester"
                  value={formData.semester}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Join as</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="learner">Learner</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>

            <div className="actions auth-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? "Creating account..." : "Create Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Auth;