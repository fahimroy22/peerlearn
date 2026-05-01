import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";

const departmentOptions = [
  "CSE","Civil","EEE","Mechanical","BBA","English",
  "MBA","Diploma in Cyber Security","Islamic Studies",
  "MA in English","Public Health",
];
const semesterOptions = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
const allowedEmailDomains = [
  "gmail.com","icloud.com","yahoo.com","outlook.com","hotmail.com","edu","ac.bd",
];

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", studentId: "", email: "",
    password: "", department: "", semester: "", role: "learner",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "studentId") {
      setFormData((p) => ({ ...p, studentId: value.replace(/\D/g, "").slice(0, 8) }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const passwordStrength = (() => {
    if (!formData.password) return null;
    if (formData.password.length < 6) return { level: 1, label: "Too short", color: "#ef4444" };
    if (formData.password.length < 10) return { level: 2, label: "Fair", color: "#f59e0b" };
    return { level: 3, label: "Strong ✓", color: "#16a34a" };
  })();

  const isValidEmail = (email) => {
    const n = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)) return false;
    const domain = n.split("@")[1];
    return allowedEmailDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fn = formData.firstName.trim(), ln = formData.lastName.trim();
    const email = formData.email.trim().toLowerCase();
    const sid = formData.studentId.trim();

    if (!fn || !ln) { showToast("First and last name are required", "error"); return; }
    if (!/^\d{8}$/.test(sid)) { showToast("Student ID must be exactly 8 digits", "error"); return; }
    if (!isValidEmail(email)) { showToast("Please use a valid email (gmail, icloud, yahoo, edu, ac.bd…)", "error"); return; }
    if (!departmentOptions.includes(formData.department)) { showToast("Please select a department", "error"); return; }
    if (!semesterOptions.includes(formData.semester)) { showToast("Please select a semester", "error"); return; }

    try {
      setSubmitting(true);
      const check = await api.post("/auth/check-email", { email });
      if (check.data?.exists) { showToast("Account already exists. Please login.", "error"); return; }
      const res = await api.post("/auth/register", {
        name: `${fn} ${ln}`, studentId: sid, email,
        password: formData.password, department: formData.department,
        semester: formData.semester, role: formData.role,
      });
      login(res.data);
      showToast("Registration successful", "success");
      navigate("/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Registration failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="au-shell au-shell-reg">
      <div className="au-blob au-blob-1" />
      <div className="au-blob au-blob-2" />

      <div className="au-reg-card">

        {/* ── Header ── */}
        <div className="au-reg-head">
          <Link to="/" className="au-reg-brand">
            Peer<span className="au-accent">Learn</span>
          </Link>
          <div>
            <span className="au-eyebrow">Join PeerLearn</span>
            <h1 className="au-reg-title">Create your account</h1>
            <p className="au-reg-sub">Build your profile and connect with tutors or learners at your university.</p>
          </div>
        </div>

        <form className="au-reg-form" onSubmit={handleSubmit} noValidate>

          {/* ── Section: Basic Info ── */}
          <div className="au-section">
            <div className="au-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Basic Information
            </div>

            <div className="au-row-2">
              <div className="au-field">
                <label htmlFor="r-fn">First name</label>
                <input id="r-fn" type="text" name="firstName" placeholder="Your first name"
                  value={formData.firstName} onChange={handleChange} autoFocus required />
              </div>
              <div className="au-field">
                <label htmlFor="r-ln">Last name</label>
                <input id="r-ln" type="text" name="lastName" placeholder="Your last name"
                  value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="au-field">
              <label htmlFor="r-sid">Student ID</label>
              <input id="r-sid" type="text" name="studentId" placeholder="e.g. 12411058"
                value={formData.studentId} onChange={handleChange}
                inputMode="numeric" maxLength={8} required />
              <span className="au-hint">8 digits — no letters or symbols.</span>
            </div>

            <div className="au-field">
              <label htmlFor="r-email">Email address</label>
              <input id="r-email" type="email" name="email" placeholder="you@gmail.com"
                value={formData.email} onChange={handleChange} required />
              <span className="au-hint">Accepted: gmail, icloud, yahoo, outlook, hotmail, edu, ac.bd</span>
            </div>

            <div className="au-field">
              <label htmlFor="r-pw">Password</label>
              <div className="au-pw-wrap">
                <input id="r-pw" type={showPassword ? "text" : "password"} name="password"
                  placeholder="Create a password (min 6 chars)"
                  value={formData.password} onChange={handleChange}
                  required autoComplete="new-password" />
                <button type="button" className="au-eye" onClick={() => setShowPassword(p => !p)} tabIndex={-1} aria-label="Toggle password">
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
              {passwordStrength && (
                <div className="au-strength">
                  <div className="au-strength-bars">
                    {[1,2,3].map(n => (
                      <div key={n} className="au-bar"
                        style={{ background: passwordStrength.level >= n ? passwordStrength.color : undefined }} />
                    ))}
                  </div>
                  <span className="au-strength-txt" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Section: Academic ── */}
          <div className="au-section">
            <div className="au-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              Academic Details
            </div>

            <div className="au-row-2">
              <div className="au-field">
                <label htmlFor="r-dept">Department</label>
                <div className="au-select-wrap">
                  <select id="r-dept" name="department" value={formData.department} onChange={handleChange} required>
                    <option value="">Select department</option>
                    {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <svg className="au-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>

              <div className="au-field">
                <label htmlFor="r-sem">Semester</label>
                <div className="au-select-wrap">
                  <select id="r-sem" name="semester" value={formData.semester} onChange={handleChange} required>
                    <option value="">Select semester</option>
                    {semesterOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <svg className="au-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Role toggle */}
            <div className="au-field">
              <label>Join as</label>
              <div className="au-role-row">
                {[
                  { val: "learner", icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  ), label: "Learner", sub: "Find tutors & book sessions" },
                  { val: "tutor", icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                  ), label: "Tutor", sub: "Teach & build reputation" },
                ].map(({ val, icon, label, sub }) => (
                  <button key={val} type="button"
                    className={`au-role-btn ${formData.role === val ? "is-active" : ""}`}
                    onClick={() => setFormData(p => ({ ...p, role: val }))}>
                    <span className="au-role-icon">{icon}</span>
                    <span className="au-role-name">{label}</span>
                    <span className="au-role-sub">{sub}</span>
                    {formData.role === val && (
                      <span className="au-role-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="au-submit" disabled={submitting}>
            {submitting ? (
              <><span className="au-spinner" /> Creating account…</>
            ) : (
              <>
                Create Free Account
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="au-switch">
          Already have an account? <Link to="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;