import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

const departmentOptions = [
  "CSE",
  "Civil",
  "EEE",
  "Mechanical",
  "BBA",
  "English",
  "MBA",
  "Diploma in Cyber Security",
  "Islamic Studies",
  "MA in English",
  "Public Health",
];

const semesterOptions = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
];

const allowedEmailDomains = [
  "gmail.com",
  "icloud.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "edu",
  "ac.bd",
];

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    email: "",
    password: "",
    department: "",
    semester: "",
    role: "learner",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "studentId") {
      const onlyDigits = value.replace(/\D/g, "").slice(0, 8);
      setFormData((prev) => ({
        ...prev,
        studentId: onlyDigits,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const passwordHint = (() => {
    if (!formData.password) return "";
    if (formData.password.length < 6) {
      return "Password should be at least 6 characters";
    }
    return "Strong password ✔";
  })();

  const isValidEmail = (email) => {
    const normalized = email.trim().toLowerCase();
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!basicEmailRegex.test(normalized)) return false;

    const domain = normalized.split("@")[1];
    return allowedEmailDomains.some(
      (allowedDomain) =>
        domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
    );
  };

  const isValidStudentId = (studentId) => /^\d{8}$/.test(studentId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedStudentId = formData.studentId.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      showToast("First name and last name are required", "error");
      return;
    }

    if (!isValidStudentId(trimmedStudentId)) {
      showToast("Student ID must be exactly 8 digits", "error");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      showToast(
        "Please enter a valid email address like @gmail.com, @icloud.com, @yahoo.com or similar",
        "error"
      );
      return;
    }

    if (!departmentOptions.includes(formData.department)) {
      showToast("Please select a valid department", "error");
      return;
    }

    if (!semesterOptions.includes(formData.semester)) {
      showToast("Please select a semester from 1st to 8th", "error");
      return;
    }

    try {
      setSubmitting(true);

      const checkRes = await api.post("/auth/check-email", {
        email: trimmedEmail,
      });

      if (checkRes.data?.exists) {
        showToast("Account already exists. Please login instead.", "error");
        return;
      }

      const fullName = `${trimmedFirstName} ${trimmedLastName}`;

      const res = await api.post("/auth/register", {
        name: fullName,
        studentId: trimmedStudentId,
        email: trimmedEmail,
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
      showToast(
        error.response?.data?.message || "Registration failed",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell auth-shell-enhanced">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />

      <div className="auth-card auth-card-enhanced auth-card-register">
        <div className="auth-header-block">
          <div className="auth-eyebrow">Join PeerLearn</div>
          <h1>Create account</h1>
          <div className="auth-subtitle">
            Build your profile and join as a learner or tutor.
          </div>
        </div>

        <form
          className="form-grid auth-form-grid auth-form-grid-register"
          onSubmit={handleSubmit}
        >
          <div className="auth-section">
            <div className="auth-section-title">Basic Information</div>

            <div className="grid grid-2 auth-compact-grid">
              <div className="auth-input-group">
                <label className="auth-label">First name</label>
                <input
                  autoFocus
                  type="text"
                  name="firstName"
                  placeholder="Your first name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Last name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Your last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Student ID</label>
              <input
                type="text"
                name="studentId"
                placeholder="Example: 12411058"
                value={formData.studentId}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={8}
                required
              />
              <div className="auth-hint">
                Student ID must be exactly 8 digits. No letters or symbols allowed.
              </div>
            </div>

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
              <div className="auth-hint">
                Use a valid email like gmail, icloud, yahoo, outlook, hotmail,
                edu, or ac.bd
              </div>
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
              {passwordHint && <div className="auth-hint">{passwordHint}</div>}
            </div>
          </div>

          <div className="auth-section auth-section-compact">
            <div className="auth-section-title">Academic Details</div>

            <div className="auth-input-group">
              <label className="auth-label">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
              >
                <option value="">Select semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Join as</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="learner">Learner</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
          </div>

          <div className="actions auth-actions auth-actions-register">
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Register"}
            </button>
          </div>
        </form>

        <div className="auth-switch-text">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;