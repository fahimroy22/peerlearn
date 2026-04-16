import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";

function Home() {
  const { user } = useAuth();

  return (
    <div className="page home-page">

      {/* ===================== HERO ===================== */}
      <section className="hero-commercial">
        <div className="hero-commercial-shell">
          <div className="hero-commercial-grid">

            {/* Left — visual */}
            <div className="hero-visual">
              <div className="hero-visual-stage">
                <div className="hero-shape hero-shape-blue" />
                <div className="hero-shape hero-shape-yellow" />
                <div className="hero-shape hero-shape-purple" />

                <div className="hero-side-copy hero-side-copy-left">
                  organized learning flow
                </div>
                <div className="hero-side-copy hero-side-copy-right">
                  trusted sessions
                </div>

                <div className="hero-visual-card">
                  <div className="hero-visual-logo">PL</div>
                  <div className="hero-visual-line hero-visual-line-lg" />
                  <div className="hero-visual-line" />
                  <div className="hero-visual-line hero-visual-line-sm" />
                </div>

                <div className="hero-floating-card hero-floating-card-top">
                  <span className="hero-floating-label">Verified tutors</span>
                  <strong>Find trusted help faster</strong>
                </div>

                <div className="hero-floating-card hero-floating-card-bottom">
                  <span className="hero-floating-label">Live chat</span>
                  <strong>Talk before booking</strong>
                </div>
              </div>
            </div>

            {/* Right — copy */}
            <div className="hero-content-commercial">
              <div className="hero-kicker">
                Peer-to-peer learning, made structured
              </div>

              <h1>
                Learn smarter with tutors, direct chat, and structured sessions.
              </h1>

              <p>
                PeerLearn helps students discover tutors, compare listings, chat in
                real time, schedule sessions, and build trust through verified
                reviews — all in one clean workspace.
              </p>

              <div className="hero-actions-commercial">
                {user ? (
                  <>
                    <Link to="/listings">
                      <button className="hero-primary">Explore Tutors</button>
                    </Link>
                    <Link to="/learn-listings">
                      <button className="hero-secondary">Post Learning Need</button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register">
                      <button className="hero-primary">Get Started</button>
                    </Link>
                    <Link to="/login">
                      <button className="hero-secondary">Sign In</button>
                    </Link>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="home-section">
        <div className="home-section-header home-section-header-split">
          <div>
            <div className="section-eyebrow">Why students like it</div>
            <h2 className="section-title-lg">Built to feel clean, fast, and reliable</h2>
          </div>
          <p className="section-copy section-copy-wide">
            Instead of scattered chats and manual coordination, PeerLearn gives both
            learners and tutors one polished system for discovery, communication,
            scheduling, and reputation.
          </p>
        </div>

        <div className="grid grid-3">
          <div className="feature-card-clean">
            <div className="feature-icon">🔎</div>
            <h3>Discover tutors faster</h3>
            <p>Compare skills, ratings, teaching style, and pricing before reaching out.</p>
          </div>

          <div className="feature-card-clean">
            <div className="feature-icon">💬</div>
            <h3>Chat with confidence</h3>
            <p>Ask questions, align expectations, and keep communication in one place.</p>
          </div>

          <div className="feature-card-clean">
            <div className="feature-icon">📅</div>
            <h3>Manage sessions cleanly</h3>
            <p>Track active sessions, changes, completions, and reviews without confusion.</p>
          </div>
        </div>
      </section>

      {/* ===================== ROLE PANELS ===================== */}
      <section className="home-section">
        <div className="home-section-header">
          <div>
            <div className="section-eyebrow">For both sides</div>
            <h2 className="section-title-lg">A polished experience for learners and tutors</h2>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="role-panel-soft-blue">
            <div className="role-panel-badge">For Learners</div>
            <h3>Find the right tutor without friction</h3>
            <p>
              Browse tutor listings, compare trust signals, send requests, and manage
              your learning journey from one dashboard.
            </p>
            <ul className="home-list">
              <li>Search tutor listings by skill and level</li>
              <li>Open profiles before making decisions</li>
              <li>Chat before confirming a session</li>
              <li>Track requests and feedback clearly</li>
            </ul>
            <div className="actions">
              <Link to="/listings">
                <button>Browse Tutors</button>
              </Link>
              <Link to="/learn-listings">
                <button className="secondary">Post a Learning Need</button>
              </Link>
            </div>
          </div>

          <div className="role-panel-soft-purple">
            <div className="role-panel-badge">For Tutors</div>
            <h3>Teach, respond, and build a stronger reputation</h3>
            <p>
              Publish listings, respond to learner needs, manage sessions, and turn
              completed work into visible credibility.
            </p>
            <ul className="home-list">
              <li>Create professional tutor listings</li>
              <li>Respond to active learner requests</li>
              <li>Keep session communication organized</li>
              <li>Grow trust with completed reviews</li>
            </ul>
            <div className="actions">
              <Link to="/dashboard">
                <button>Go to Dashboard</button>
              </Link>
              <Link to="/chats">
                <button className="secondary">Open Chats</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROOF ===================== */}
      <section className="home-section home-proof-section">
        <div className="home-section-header home-section-header-split">
          <div>
            <div className="section-eyebrow">Platform value</div>
            <h2 className="section-title-lg">Everything important stays visible</h2>
          </div>
          <p className="section-copy section-copy-wide">
            Tutor identity, reviews, session history, chats, and learner requests are
            all surfaced clearly so decisions feel easier and the platform feels
            trustworthy.
          </p>
        </div>

        <div className="proof-grid">
          <div className="proof-card">
            <div className="proof-number">01</div>
            <h3>Profiles with substance</h3>
            <p>Show public identity, teaching style, avatar, department, and ratings.</p>
          </div>
          <div className="proof-card">
            <div className="proof-number">02</div>
            <h3>Actionable dashboards</h3>
            <p>See what matters first: ratings, readiness, recent reviews, and account data.</p>
          </div>
          <div className="proof-card">
            <div className="proof-number">03</div>
            <h3>Structured conversations</h3>
            <p>Separate request chats from session chats and reduce unnecessary confusion.</p>
          </div>
          <div className="proof-card">
            <div className="proof-number">04</div>
            <h3>Trust after every session</h3>
            <p>Completed session reviews help future learners choose more confidently.</p>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="home-section">
        <div className="cta-section-commercial">
          <div className="cta-grid">
            <div>
              <div className="section-eyebrow">Start now</div>
              <h2>Make learning coordination feel premium, not chaotic</h2>
              <p>
                PeerLearn brings tutor discovery, direct messaging, session management,
                and verified feedback into one refined academic marketplace.
              </p>
            </div>
            <div className="cta-actions-right">
              {!user ? (
                <>
                  <Link to="/register">
                    <button>Create Account</button>
                  </Link>
                  <Link to="/login">
                    <button className="secondary">Sign In</button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard">
                    <button>Go to Dashboard</button>
                  </Link>
                  <Link to="/chats">
                    <button className="secondary">Open Chats</button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="home-footer">
        <div className="home-footer-grid">
          <div className="home-footer-brand">
            <div className="home-footer-logo">
              <span className="home-footer-logo-dark">Peer</span>
              <span className="home-footer-logo-accent">Learn</span>
            </div>
            <p>
              A cleaner peer-to-peer learning platform for tutor discovery, chat,
              session management, and verified reviews.
            </p>
          </div>

          <div className="home-footer-links">
            <h4>Explore</h4>
            <Link to="/listings">Tutor Listings</Link>
            <Link to="/learn-listings">Learn Listings</Link>
            <Link to="/requests">Requests</Link>
            <Link to="/sessions">Sessions</Link>
          </div>

          <div className="home-footer-links">
            <h4>Workspace</h4>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/chats">Chats</Link>
            <Link to="/edit-profile">Edit Profile</Link>
            {!user && <Link to="/register">Create Account</Link>}
          </div>

          <div className="home-footer-note">
            <h4>Why it works</h4>
            <p>
              Built for students who need fast decisions, clear communication, and
              more trust before booking a session.
            </p>
          </div>
        </div>

        <div className="home-footer-bottom">
          <span>© {new Date().getFullYear()} PeerLearn</span>
          <span>Structured peer learning for modern students</span>
        </div>
      </footer>

    </div>
  );
}

export default Home;
