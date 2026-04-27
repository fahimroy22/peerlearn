import { useNavigate } from "react-router-dom";

function HelpCenter() {
  const navigate = useNavigate();

  const helpCards = [
    {
      title: "Login",
      description:
        "Password, session expiry, invalid credentials, or blocked access.",
      category: "login",
      subject: "Login problem",
      icon: "🔐",
    },
    {
      title: "Session",
      description:
        "Meet link missing, wrong time, or unable to join a session.",
      category: "session",
      subject: "Session issue",
      icon: "📅",
    },
    {
      title: "Listing",
      description:
        "Listing not posting, missing, hidden, or not updating properly.",
      category: "listing",
      subject: "Listing problem",
      icon: "📋",
    },
    {
      title: "Exchange",
      description:
        "Problems with exchange requests, matching, or exchange chat.",
      category: "exchange",
      subject: "Exchange issue",
      icon: "🔁",
    },
    {
      title: "Bug",
      description:
        "Broken page, slow loading, app error, or unexpected behavior.",
      category: "bug",
      subject: "Bug report",
      icon: "🐞",
    },
    {
      title: "Other",
      description:
        "Anything else that needs support or admin review.",
      category: "other",
      subject: "Other support issue",
      icon: "💬",
    },
  ];

  const openTicket = (item) => {
    navigate(
      `/support/new?category=${encodeURIComponent(
        item.category
      )}&subject=${encodeURIComponent(item.subject)}`
    );
  };

  return (
    <div className="page">
      <div className="sh-page">
        <section className="sh-header">
          <div className="sh-eyebrow">⚡ Support</div>
          <h1 className="sh-title">Help & Contact Us</h1>
          <p className="sh-subtitle">
            Choose an issue type and continue to chat. Common problems get an
            instant automated first reply, and admins can continue in the same thread.
          </p>
        </section>

        <div className="sh-layout">
          <section className="sh-main">
            <div className="sh-section-label">Choose issue type</div>

            <div className="sh-grid">
              {helpCards.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="sh-card"
                  onClick={() => openTicket(item)}
                >
                  <div className="sh-card-icon">{item.icon}</div>

                  <div>
                    <div className="sh-card-title">{item.title}</div>
                    <div className="sh-card-text">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="sh-actions">
              <button
                type="button"
                className="st-submit-btn"
                onClick={() => navigate("/support/new")}
              >
                Start New Support Chat
              </button>
            </div>
          </section>

          <aside className="sh-side">
            <div className="sh-side-card">
              <div className="sh-side-title">✦ How it works</div>
              <ul className="sh-side-list">
                <li>Choose the issue type that fits best.</li>
                <li>Pick a common problem or describe your own.</li>
                <li>You get an instant automated first reply.</li>
                <li>An admin continues in the same chat if needed.</li>
              </ul>
            </div>

            <div className="sh-side-card">
              <div className="sh-side-title">💡 Helpful tips</div>
              <ul className="sh-side-list">
                <li>Include the page where the issue happened.</li>
                <li>Explain what you expected vs. what happened.</li>
                <li>Attach a screenshot whenever possible.</li>
              </ul>
            </div>

            <button
              type="button"
              className="support-secondary-button"
              onClick={() => navigate("/support/my")}
            >
              View My Tickets
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default HelpCenter;