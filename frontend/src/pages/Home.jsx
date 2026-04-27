import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import useAuth from "../context/useAuth";

/* ── IntersectionObserver reveal hook ── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Animated counter ── */
function Counter({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(to / 55));
    const id = setInterval(() => {
      cur += step;
      if (cur >= to) { setVal(to); clearInterval(id); }
      else setVal(cur);
    }, 18);
    return () => clearInterval(id);
  }, [visible, to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Tilt card ── */
function TiltCard({ children, className, style }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateZ(4px)`;
  };
  const onLeave = () => { ref.current.style.transform = ""; };
  return (
    <div ref={ref} className={className} style={style} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [statsRef, statsVisible] = useReveal();
  const [featRef,  featVisible]  = useReveal();
  const [rolesRef, rolesVisible] = useReveal();
  const [stepsRef, stepsVisible] = useReveal();
  const [ctaRef,   ctaVisible]   = useReveal();

  return (
    <div className="page home-page">

      {/* ══════════ HERO ══════════ */}
      <section className="hl-hero">
        <div className="hl-blob hl-blob-a" />
        <div className="hl-blob hl-blob-b" />
        <div className="hl-blob hl-blob-c" />

        <div className="hl-hero-inner">
          <div className="hl-badge">
            <span className="hl-badge-ping" />
            Peer-to-peer · Live chat · Verified tutors
          </div>

          <h1 className="hl-headline">
            <span className="hl-hl-l1">Learn from</span>
            <em className="hl-hl-em">those who</em>
            <span className="hl-hl-l3">actually know.</span>
          </h1>

          <p className="hl-sub">
            Discover tutors, book sessions, and build academic momentum — without the noise.
          </p>

          <div className="hl-hero-cta">
            {user ? (
              <>
                <Link to="/listings">
                  <button className="hl-btn-primary">Explore Tutors</button>
                </Link>
                <Link to="/dashboard">
                  <button className="hl-btn-outline">Dashboard →</button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register">
                  <button className="hl-btn-primary">Get Started Free</button>
                </Link>
                <Link to="/login">
                  <button className="hl-btn-outline">Sign In →</button>
                </Link>
              </>
            )}
          </div>

          {/* floating trust pills */}
          <div className="hl-pill hl-pill-a">
            <span className="hl-dot hl-dot-green" />Session live
          </div>
          <div className="hl-pill hl-pill-b">
            <span className="hl-dot hl-dot-amber" />4.9 avg rating
          </div>
          <div className="hl-pill hl-pill-c">
            <span className="hl-dot hl-dot-blue" />Verified ✓
          </div>
        </div>

        <div className="hl-scroll-cue">
          <div className="hl-scroll-track"><div className="hl-scroll-dot" /></div>
          <span>scroll</span>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <div ref={statsRef} className={`hl-stats-wrap ${statsVisible ? "hl-in" : ""}`}>
        <div className="hl-stats-band">
          {[
            { val: 20, suffix: "+", label: "Active Tutors" },
            { val: 98,  suffix: "%", label: "Session Satisfaction" },
            { val: 1,  suffix: "k", label: "Messages Sent" },
            { val: 200, suffix: "+", label: "Sessions Booked" },
          ].map(({ val, suffix, label }, i) => (
            <div key={i} className="hl-stat" style={{ "--i": i }}>
              <div className="hl-stat-num">
                {statsVisible ? <Counter to={val} suffix={suffix} /> : `0${suffix}`}
              </div>
              <div className="hl-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ FEATURES ══════════ */}
      <section ref={featRef} className={`hl-section ${featVisible ? "hl-in" : ""}`}>
        <div className="hl-section-head">
          <span className="hl-eyebrow">What you get</span>
          <h2 className="hl-section-title">Everything in one place</h2>
        </div>

        <div className="hl-feat-grid">
          {[
            { icon: "🔎", title: "Smart Discovery",  body: "Filter tutors by subject, level, and rating. Find the right match fast.",  color: "#2563eb" },
            { icon: "💬", title: "Live Chat",        body: "Talk before you book. Align expectations with real-time messaging.",        color: "#d97706" },
            { icon: "📅", title: "Session Flow",     body: "Track bookings, completions, and feedback in one clean dashboard.",        color: "#059669" },
            { icon: "⭐", title: "Verified Reviews", body: "Every completed session earns trust. Build your reputation over time.",     color: "#7c3aed" },
          ].map(({ icon, title, body, color }, i) => (
            <TiltCard key={i} className="hl-feat-card" style={{ "--i": i, "--ac": color }}>
              <div className="hl-feat-icon" style={{ background: color + "15", color }}>{icon}</div>
              <h3>{title}</h3>
              <p>{body}</p>
              <div className="hl-feat-accent-bar" style={{ background: color }} />
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ══════════ ROLES ══════════ */}
      <section ref={rolesRef} className={`hl-section ${rolesVisible ? "hl-in" : ""}`}>
        <div className="hl-section-head">
          <span className="hl-eyebrow">Who it's for</span>
          <h2 className="hl-section-title">Built for both sides</h2>
        </div>

        <div className="hl-roles-grid">
          <TiltCard className="hl-role-card hl-role-learner">
            <div className="hl-role-tag">For Learners</div>
            <h3>Find help without the friction</h3>
            <ul className="hl-role-list">
              <li>Browse verified tutors by subject</li>
              <li>Chat before committing</li>
              <li>Track every session clearly</li>
              <li>Leave reviews that help others</li>
            </ul>
            <div className="hl-role-actions">
              <Link to="/listings">
                <button className="hl-btn-primary hl-btn-sm">Browse Tutors</button>
              </Link>
              <Link to="/learn-listings">
                <button className="hl-btn-outline hl-btn-sm">Post a Need</button>
              </Link>
            </div>
          </TiltCard>

          <TiltCard className="hl-role-card hl-role-tutor">
            <div className="hl-role-tag">For Tutors</div>
            <h3>Teach, respond, and grow</h3>
            <ul className="hl-role-list">
              <li>Publish professional listings</li>
              <li>Respond to learner requests</li>
              <li>Manage sessions in one place</li>
              <li>Build credibility with reviews</li>
            </ul>
            <div className="hl-role-actions">
              <Link to="/dashboard">
                <button className="hl-btn-primary hl-btn-sm">Go to Dashboard</button>
              </Link>
              <Link to="/chats">
                <button className="hl-btn-outline hl-btn-sm">Open Chats</button>
              </Link>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section ref={stepsRef} className={`hl-section ${stepsVisible ? "hl-in" : ""}`}>
        <div className="hl-section-head">
          <span className="hl-eyebrow">How it works</span>
          <h2 className="hl-section-title">Three steps to your session</h2>
        </div>

        <div className="hl-steps">
          {[
            { n: "01", title: "Discover", body: "Browse tutor listings. Compare skills, ratings, and teaching style." },
            { n: "02", title: "Connect",  body: "Open a chat. Ask questions and align before booking." },
            { n: "03", title: "Learn",    body: "Confirm the session, attend, and leave a verified review." },
          ].map(({ n, title, body }, i) => (
            <div key={i} className="hl-step" style={{ "--i": i }}>
              <div className="hl-step-num">{n}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section ref={ctaRef} className={`hl-cta ${ctaVisible ? "hl-in" : ""}`}>
        <div className="hl-cta-blob-a" />
        <div className="hl-cta-blob-b" />
        <div className="hl-cta-inner">
          <span className="hl-eyebrow hl-eyebrow-inv">Ready?</span>
          <h2 className="hl-cta-heading">Learning starts here.</h2>
          <p className="hl-cta-sub">
            Join PeerLearn and turn peer knowledge into structured progress.
          </p>
          <div className="hl-cta-btns">
            {!user ? (
              <>
                <Link to="/register">
                  <button className="hl-btn-white hl-btn-lg">Create Free Account</button>
                </Link>
                <Link to="/login">
                  <button className="hl-btn-outline-inv hl-btn-lg">Sign In →</button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard">
                  <button className="hl-btn-white hl-btn-lg">Go to Dashboard</button>
                </Link>
                <Link to="/listings">
                  <button className="hl-btn-outline-inv hl-btn-lg">Explore Tutors →</button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="hl-footer">
        <div className="hl-footer-inner">
          <div className="hl-footer-brand">
            <div className="hl-footer-logo">
              Peer<span className="hl-logo-accent">Learn</span>
            </div>
            <p>Structured peer learning for modern students.</p>
          </div>
          <div className="hl-footer-nav">
            <div className="hl-footer-col">
              <h4>Explore</h4>
              <Link to="/listings">Tutor Listings</Link>
              <Link to="/learn-listings">Learn Listings</Link>
              <Link to="/requests">Requests</Link>
              <Link to="/sessions">Sessions</Link>
            </div>
            <div className="hl-footer-col">
              <h4>Workspace</h4>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/chats">Chats</Link>
              <Link to="/edit-profile">Edit Profile</Link>
              {!user && <Link to="/register">Create Account</Link>}
            </div>
          </div>
        </div>
        <div className="hl-footer-bottom">
          <span>© {new Date().getFullYear()} PeerLearn</span>
          <span>Made for students who move fast</span>
        </div>
      </footer>

    </div>
  );
}