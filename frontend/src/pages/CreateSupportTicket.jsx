import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createSupportTicket } from "../api/supportApi";
import useToast from "../context/useToast";

const categoryOptions = [
  { key: "login",    icon: "🔐", title: "Login",    description: "Password, session, account access" },
  { key: "session",  icon: "📅", title: "Session",  description: "Meet link, timing, joining issues" },
  { key: "listing",  icon: "📋", title: "Listing",  description: "Posting, visibility, updates" },
  { key: "exchange", icon: "🔄", title: "Exchange", description: "Requests, matching, exchange chat" },
  { key: "bug",      icon: "🐛", title: "Bug",      description: "Broken page, slow app, errors" },
  { key: "other",    icon: "💬", title: "Other",    description: "Anything else that needs support" },
];

const suggestedQuestionsMap = {
  login:    ["I forgot my password", "I can't login with correct info", "My session keeps expiring", "I'm getting invalid password errors"],
  session:  ["My Meet link is missing", "My session time is wrong", "I cannot join the session", "Session was marked incorrectly"],
  listing:  ["My listing is not showing", "I cannot create a listing", "My listing disappeared", "Listing details not updating"],
  exchange: ["Exchange request not working", "I can't open exchange chat", "My match is missing", "My exchange post isn't visible"],
  bug:      ["A button is not working", "A page is broken", "The app is very slow", "Something unexpected happened"],
  other:    ["I need account help", "I need admin support", "I have a platform issue", "Help with something else"],
};

const autoReplyMap = {
  login:    "You'll receive an instant reply with common login guidance before admin review.",
  session:  "You'll get an instant reply about session links or timing before admin review.",
  listing:  "You'll get instant listing troubleshooting tips before admin review.",
  exchange: "You'll get instant exchange troubleshooting before admin review.",
  bug:      "You'll get an instant reply asking for useful bug details first.",
  other:    "You'll get an instant acknowledgment — admin will continue in the same chat.",
};

function UploadIcon() {
  return (
    <svg
      className="st-file-svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function getProgress(formData, selectedQuestion) {
  let done = 0;
  if (formData.category) done++;
  if (selectedQuestion || formData.text.trim()) done++;
  if (formData.subject.trim()) done++;
  return done;
}

function CreateSupportTicket() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const presetCategory = searchParams.get("category") || "login";
  const presetSubject  = searchParams.get("subject")  || "";

  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState("");

  const [formData, setFormData] = useState({
    subject:  presetSubject,
    category: presetCategory,
    text:     "",
    priority: "medium",
  });

  const suggestedQuestions = useMemo(() => suggestedQuestionsMap[formData.category] || suggestedQuestionsMap.other, [formData.category]);
  const autoReply          = useMemo(() => autoReplyMap[formData.category] || autoReplyMap.other, [formData.category]);
  const progress           = getProgress(formData, selectedQuestion, selectedFile);
  const progressPercent    = (progress / 3) * 100;

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCategorySelect = (key) => {
    setFormData((p) => ({ ...p, category: key }));
    setSelectedQuestion("");
  };

  const handlePickQuestion = (q) => {
    setSelectedQuestion(q);
    setFormData((p) => ({
      ...p,
      text: q,
      subject: p.subject?.trim()
        ? p.subject
        : (categoryOptions.find((c) => c.key === p.category)?.title || "") + " issue",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      showToast("Subject is required", "error");
      return;
    }
    if (!formData.text.trim() && !selectedFile) {
      showToast("Please describe your issue or attach a file", "error");
      return;
    }

    try {
      setSubmitting(true);

      const payload = new FormData();
      payload.append("subject",   formData.subject.trim());
      payload.append("category",  formData.category);
      payload.append("text",      formData.text.trim());
      payload.append("priority",  formData.priority);
      if (selectedFile) payload.append("file", selectedFile);

      const data = await createSupportTicket(payload);

      showToast("Support ticket created successfully", "success");

      if (data?.ticket?._id) navigate(`/support/${data.ticket._id}`);
      else                    navigate("/support/my");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to create support ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="st-page">

        {/* ── Header ── */}
        <div className="st-header">
          <div className="st-eyebrow">⚡ Support</div>
          <h1 className="st-title">Open a Support Ticket</h1>
          <p className="st-subtitle">
            Choose your issue type, pick a common problem, and we'll get you help fast — usually with an instant first reply.
          </p>
        </div>

        <div className="st-layout">

          {/* ── Main card ── */}
          <div className="st-card">

            {/* Progress bar */}
            <div className="st-progress-header">
              <div className="st-progress-labels">
                {["Issue type", "Describe it", "Submit"].map((s, i) => (
                  <span key={s} className={`st-progress-label ${progress > i ? "done" : ""}`}>{s}</span>
                ))}
              </div>
              <div className="st-prog-line">
                <div className="st-prog-line-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="st-card-body">

              {/* 1 · Category */}
              <div>
                <div className="st-label">1 · Choose issue type</div>
                <div className="st-cat-grid">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`st-cat-btn ${formData.category === cat.key ? "active" : ""}`}
                      onClick={() => handleCategorySelect(cat.key)}
                    >
                      <span className="st-cat-icon">{cat.icon}</span>
                      <span className="st-cat-text">
                        <span className="st-cat-name">{cat.title}</span>
                        <span className="st-cat-desc">{cat.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 · Common questions */}
              <div>
                <div className="st-label">2 · Common questions — pick one or write your own below</div>
                <div className="st-q-grid">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`st-q-btn ${selectedQuestion === q ? "active" : ""}`}
                      onClick={() => handlePickQuestion(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="st-divider" />

              {/* 3 · Subject + Priority */}
              <div>
                <div className="st-label">3 · Details</div>
                <div className="st-input-row">
                  <div className="st-field">
                    <label className="st-field-label">Subject</label>
                    <input
                      className="st-input"
                      type="text"
                      name="subject"
                      placeholder="Brief summary of the issue"
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="st-field">
                    <label className="st-field-label">Priority</label>
                    <div className="st-priority-row">
                      {["low", "medium", "high"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`st-priority-opt ${formData.priority === p ? `active-${p}` : ""}`}
                          onClick={() => setFormData((prev) => ({ ...prev, priority: p }))}
                        >
                          {p === "low" ? "🟢" : p === "medium" ? "🟡" : "🔴"}{" "}
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Instant help preview */}
              <div className="st-preview">
                <span className="st-preview-icon">⚡</span>
                <div>
                  <div className="st-preview-tag">Instant help preview</div>
                  <div className="st-preview-text">{autoReply}</div>
                </div>
              </div>

              {/* Describe issue */}
              <div className="st-field">
                <label className="st-field-label">Describe your issue</label>
                <textarea
                  className="st-textarea"
                  name="text"
                  rows="5"
                  placeholder="Example: I tried logging in with the correct email and password but it still says invalid password."
                  value={formData.text}
                  onChange={handleChange}
                  required={!selectedFile}
                />
              </div>

              {/* File upload */}
              <div>
                <div className="st-label" style={{ marginBottom: 8 }}>Attach a file (optional)</div>
                {selectedFile ? (
                  <div className="st-file-selected">
                    <span className="st-file-selected-name">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                      </svg>
                      {selectedFile.name}
                    </span>
                    <button type="button" className="st-remove-btn" onClick={() => setSelectedFile(null)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="st-file-zone">
                    <input
                      type="file"
                      className="st-file-input"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <UploadIcon />
                    <div className="st-file-label">Click to attach a screenshot or file</div>
                    <div className="st-file-hint">PNG, JPG, PDF up to 10MB</div>
                  </div>
                )}
              </div>

              <div className="st-divider" />

              {/* Submit */}
              <button
                type="button"
                className="st-submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="st-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Creating ticket…
                  </>
                ) : (
                  <>
                    Open Ticket &amp; Continue to Chat
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>

            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="st-side">
            <div className="st-side-card">
              <div className="st-side-head">✦ How it works</div>
              <ul className="st-side-list">
                <li>Choose the issue type that fits best.</li>
                <li>Pick a common problem or describe your own.</li>
                <li>You get an instant automated first reply.</li>
                <li>An admin continues in the same chat if needed.</li>
              </ul>
            </div>

            <div className="st-side-card">
              <div className="st-side-head">💡 Helpful tips</div>
              <ul className="st-side-list">
                <li>Include the page where the issue happened.</li>
                <li>Explain what you expected vs. what happened.</li>
                <li>Attach a screenshot whenever possible.</li>
                <li>Use High priority only for urgent blockers.</li>
              </ul>
            </div>

            <div className="st-contact-note">
              <strong>Average response time</strong>
              Admins typically respond within a few hours during business days.
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default CreateSupportTicket;