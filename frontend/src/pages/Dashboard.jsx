import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../api/axios";
import useToast from "../context/useToast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [availability, setAvailability] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const profileRes = await api.get("/users/profile");
      setProfile(profileRes.data);

      if (profileRes.data.role === "tutor") {
        const [reviewsRes, availabilityRes] = await Promise.all([
          api.get("/reviews/my-received"),
          api.get(`/availability/${profileRes.data._id}`),
        ]);

        setReviews(reviewsRes.data || []);
        setAvailability(
          Array.isArray(availabilityRes.data) ? availabilityRes.data : []
        );
      } else {
        setReviews([]);
        setAvailability([]);
      }
    } catch (error) {
      console.error("Failed to load dashboard data", error);
      showToast("Failed to load dashboard", "error");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currentUser = profile || user;
  const isAdmin = Boolean(currentUser?.isAdmin);
  const isTutor = currentUser?.role === "tutor";

  const averageRating =
    currentUser?.ratingAvg?.toFixed?.(1) || currentUser?.ratingAvg || 0;
  const totalReviews = currentUser?.ratingCount || 0;
  const currentBadge = currentUser?.badge || "Beginner";

  const totalAvailabilitySlots = useMemo(() => {
    return availability.reduce((sum, day) => sum + (day.slots?.length || 0), 0);
  }, [availability]);

  const availableDaysCount = useMemo(() => {
    return availability.filter((day) => (day.slots?.length || 0) > 0).length;
  }, [availability]);

  const formatTime12Hour = (timeValue) => {
    if (!timeValue || !timeValue.includes(":")) return timeValue || "";

    const [rawHour, rawMinute] = timeValue.split(":");
    const hour = Number(rawHour);
    const minute = Number(rawMinute);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return timeValue;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 || 12;
    const normalizedMinute = String(minute).padStart(2, "0");

    return `${normalizedHour}:${normalizedMinute} ${period}`;
  };

  const formatSlotRange = (slot) => {
    if (!slot?.start || !slot?.end) return "Time unavailable";
    return `${formatTime12Hour(slot.start)} - ${formatTime12Hour(slot.end)}`;
  };

  const availabilityPreview = useMemo(() => {
    const activeDays = DAYS.map((day) =>
      availability.find((item) => item.day === day)
    ).filter((item) => item && item.slots && item.slots.length > 0);

    return activeDays.slice(0, 3);
  }, [availability]);

  const weeklyAvailability = useMemo(() => {
    return DAYS.map((day) => {
      const existing = availability.find((item) => item.day === day);
      return {
        day,
        slots: existing?.slots || [],
      };
    });
  }, [availability]);

  const completionItems = useMemo(() => {
    return [
      { label: "Avatar", done: Boolean(currentUser?.avatar) },
      { label: "Bio", done: Boolean(currentUser?.bio) },
      { label: "Teaching style", done: Boolean(currentUser?.teachingStyle) },
      { label: "Department", done: Boolean(currentUser?.department) },
      { label: "Semester", done: Boolean(currentUser?.semester) },
      {
        label: "Availability",
        done: !isTutor || totalAvailabilitySlots > 0,
      },
    ];
  }, [currentUser, totalAvailabilitySlots, isTutor]);

  const completionPercent = useMemo(() => {
    const done = completionItems.filter((item) => item.done).length;
    return Math.round((done / completionItems.length) * 100);
  }, [completionItems]);

  const missingItem = completionItems.find((item) => !item.done);

  const profileReadinessText =
    completionPercent >= 80
      ? "Your profile is in strong shape and ready for discovery."
      : isTutor
      ? "Add more details and availability to improve credibility and visibility."
      : "Add more profile details to improve visibility and trust.";

  const nextBestAction = missingItem
    ? `Add ${missingItem.label.toLowerCase()}`
    : "Review your public profile";

  const profileStrengthMessage =
    completionPercent >= 90
      ? "Excellent profile strength. You look ready for learners."
      : completionPercent >= 70
      ? "Your profile is discoverable, but a few details can make it more trustworthy."
      : "Your profile needs a little more detail before it feels learner-ready.";

  const latestReview = reviews[0];

  const nextBadgeText =
    currentBadge === "Top Tutor"
      ? "You have reached the highest tutor tier."
      : currentBadge === "Excellent"
      ? "Next badge: Top Tutor. Keep collecting strong reviews."
      : currentBadge === "Trusted"
      ? "Next badge: Excellent. Consistent ratings will help you level up."
      : "Next badge: Trusted. Complete sessions and collect positive reviews.";

  const badgeProgressItems = ["Beginner", "Trusted", "Excellent", "Top Tutor"];

  const isBadgeActive = (badge) => {
    if (badge === currentBadge) return true;

    if (currentBadge === "Trusted") {
      return badge === "Beginner";
    }

    if (currentBadge === "Excellent") {
      return ["Beginner", "Trusted"].includes(badge);
    }

    if (currentBadge === "Top Tutor") {
      return ["Beginner", "Trusted", "Excellent"].includes(badge);
    }

    return false;
  };

  if (isAdmin) {
    return (
      <div className="page dashboard-page">
        <section className="dashboard-shell">
          <section className="dashboard-hero dashboard-hero-admin">
            <div className="dashboard-hero-copy">
              <span className="dashboard-kicker">Admin Panel</span>
              <h1>Welcome back, {currentUser?.name || "Admin"}</h1>
              <p>
                This account has admin access. Use the admin dashboard to manage
                users, tutors, reviews, requests, and platform activity.
              </p>
            </div>

            <div className="dashboard-hero-actions">
              <Link to="/admin" className="dashboard-primary-action">
                Go to Admin Dashboard
              </Link>
            </div>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <section className="dashboard-shell">
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-kicker">My Dashboard</span>
            <h1>Welcome back, {currentUser?.name || "User"}</h1>
            <p>
              Keep your profile polished, monitor your account, and stay ready
              for new opportunities on PeerLearn.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <Link to="/edit-profile" className="dashboard-primary-action">
              Edit Profile
            </Link>
          </div>
        </section>

        <section className="dashboard-card dashboard-profile-card">
          <div className="dashboard-profile-header">
            <div className="dashboard-avatar-ring">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="dashboard-avatar"
                />
              ) : (
                <div className="dashboard-avatar dashboard-avatar-fallback">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </div>

            <div className="dashboard-profile-info">
              <div className="dashboard-profile-topline">
                <div>
                  <h2>{currentUser?.name || "Not set"}</h2>
                  <p>{currentUser?.email || "No email"}</p>
                </div>

                <div className="dashboard-chip-row">
                  <span className="dashboard-chip">
                    {currentUser?.role || "user"}
                  </span>

                  {currentUser?.department && (
                    <span className="dashboard-chip">
                      {currentUser.department}
                    </span>
                  )}

                  {currentUser?.semester && (
                    <span className="dashboard-chip">
                      Semester {currentUser.semester}
                    </span>
                  )}

                  {isTutor && (
                    <span className="dashboard-chip accent">
                      {currentBadge}
                    </span>
                  )}
                </div>
              </div>

              <div className="dashboard-info-grid">
                <div>
                  <span>User ID</span>
                  <strong>{currentUser?.publicId || "No ID yet"}</strong>
                </div>

                <div>
                  <span>Account Type</span>
                  <strong>
                    {isTutor ? "Tutor Account" : "Learner Account"}
                  </strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>{currentUser?.department || "Not set"}</strong>
                </div>

                <div>
                  <span>Semester</span>
                  <strong>{currentUser?.semester || "Not set"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-top-grid">
          <article className="dashboard-card dashboard-today-card">
            <div>
              <span className="dashboard-kicker">Today</span>
              <h2>{nextBestAction}</h2>
              <p>{profileStrengthMessage}</p>
            </div>

            <div className="dashboard-today-footer">
              <div className="dashboard-mini-progress">
                <div style={{ width: `${completionPercent}%` }} />
              </div>

              <Link to="/edit-profile" className="dashboard-primary-action">
                Complete this step
              </Link>
            </div>
          </article>

          <section className="dashboard-card dashboard-readiness-card dashboard-readiness-compact">
            <div className="dashboard-readiness-top">
              <div>
                <span className="dashboard-kicker">Profile Readiness</span>
                <h2>{completionPercent}%</h2>
                <p>{profileReadinessText}</p>
              </div>

              <div
                className="dashboard-progress-circle"
                style={{ "--progress": `${completionPercent}%` }}
              >
                <div>
                  <strong>{completionPercent}%</strong>
                  <span>Ready</span>
                </div>
              </div>
            </div>

            <div className="dashboard-mini-checklist">
              {completionItems.map((item) => (
                <span
                  key={item.label}
                  className={item.done ? "is-complete" : "is-missing"}
                >
                  {item.done ? "✓" : "×"} {item.label}
                </span>
              ))}
            </div>

            <Link to="/edit-profile" className="dashboard-secondary-action">
              Improve Profile
            </Link>
          </section>

          <article className="dashboard-card dashboard-quick-actions-card">
            <div className="dashboard-section-header">
              <div>
                <h2>Quick Actions</h2>
                <p>Jump straight into the tasks that matter most.</p>
              </div>
            </div>

            <div className="dashboard-action-grid">
              <Link to="/edit-profile">Edit Profile</Link>
              <Link to="/edit-profile">Update Availability</Link>
              <Link to="/tutors">Explore Tutors</Link>
              <Link to="/dashboard">Check Requests</Link>
            </div>
          </article>
        </section>

        <section className="dashboard-metrics-grid">
          {isTutor ? (
            <>
              <article className="dashboard-metric-card is-featured">
                <span>Average Rating</span>
                <strong>{averageRating}</strong>
                <small>
                  {Number(averageRating) > 0
                    ? "Good start — more reviews build trust"
                    : "No ratings yet — complete sessions to start"}
                </small>
              </article>

              <article className="dashboard-metric-card">
                <span>Reviews</span>
                <strong>{totalReviews}</strong>
                <small>Learner feedback received</small>
              </article>

              <article className="dashboard-metric-card">
                <span>Availability</span>
                <strong>{totalAvailabilitySlots}</strong>
                <small>
                  {availableDaysCount} active day
                  {availableDaysCount === 1 ? "" : "s"} this week
                </small>
              </article>

              <article className="dashboard-metric-card">
                <span>Badge</span>
                <strong>{currentBadge}</strong>
                <small>Your current growth tier</small>
              </article>
            </>
          ) : (
            <>
              <article className="dashboard-metric-card is-featured">
                <span>Account Role</span>
                <strong>Learner</strong>
                <small>Ready to explore tutors</small>
              </article>

              <article className="dashboard-metric-card">
                <span>Status</span>
                <strong>Active</strong>
                <small>Your account is ready</small>
              </article>

              <article className="dashboard-metric-card">
                <span>Department</span>
                <strong>{currentUser?.department || "Not set"}</strong>
                <small>Academic information</small>
              </article>

              <article className="dashboard-metric-card">
                <span>Semester</span>
                <strong>{currentUser?.semester || "Not set"}</strong>
                <small>Current study level</small>
              </article>
            </>
          )}
        </section>

        <section className="dashboard-card dashboard-content-grid">
          <article className="dashboard-text-widget">
            <span>Bio</span>
            <p>
              {currentUser?.bio ||
                "Your bio is empty. Add 2–3 lines about your strengths so learners know why to choose you."}
            </p>
          </article>

          <article className="dashboard-text-widget">
            <span>{isTutor ? "Teaching Style" : "About You"}</span>
            <p>
              {currentUser?.teachingStyle ||
                (isTutor
                  ? "No teaching style added yet. Explain how you teach, how you explain difficult topics, and what learners can expect."
                  : "No additional profile details added yet.")}
            </p>
          </article>
        </section>

        {isTutor && (
          <section className="dashboard-insight-grid">
            <article className="dashboard-card dashboard-growth-card">
              <div>
                <span className="dashboard-kicker">Tutor Growth</span>
                <h2>{currentBadge}</h2>
                <p>{nextBadgeText}</p>
              </div>

              <div className="dashboard-badge-progress">
                {badgeProgressItems.map((badge) => (
                  <div
                    key={badge}
                    className={isBadgeActive(badge) ? "active" : ""}
                  >
                    <span />
                    <small>{badge === "Top Tutor" ? "Top" : badge}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card dashboard-week-card">
              <div className="dashboard-section-header">
                <div>
                  <h2>Weekly Availability</h2>
                  <p>Your visible weekly teaching schedule.</p>
                </div>
              </div>

              <div className="dashboard-week-list">
                {weeklyAvailability.map((dayItem) => (
                  <div
                    key={dayItem.day}
                    className={
                      dayItem.slots.length > 0
                        ? "dashboard-week-row active"
                        : "dashboard-week-row"
                    }
                  >
                    <div>
                      <strong>{dayItem.day}</strong>
                      <span>
                        {dayItem.slots.length > 0
                          ? `${dayItem.slots.length} slot${
                              dayItem.slots.length === 1 ? "" : "s"
                            }`
                          : "No availability"}
                      </span>
                    </div>

                    {dayItem.slots.length > 0 ? (
                      <div className="dashboard-week-times">
                        {dayItem.slots.slice(0, 2).map((slot, index) => (
                          <small
                            key={`${dayItem.day}-${slot.start}-${slot.end}-${index}`}
                          >
                            {formatSlotRange(slot)}
                          </small>
                        ))}
                        {dayItem.slots.length > 2 && (
                          <small>+{dayItem.slots.length - 2} more</small>
                        )}
                      </div>
                    ) : (
                      <em>—</em>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {isTutor && (
          <section className="dashboard-card dashboard-content-grid dashboard-balanced-grid">
            <article className="dashboard-text-widget dashboard-compact-widget">
              <span>Tutor Badge</span>
              <p>
                {currentBadge === "Top Tutor" &&
                  "Top Tutor — excellent rating and strong review history."}
                {currentBadge === "Excellent" &&
                  "Excellent — highly rated and trusted by learners."}
                {currentBadge === "Trusted" &&
                  "Trusted — consistently good reviews from learners."}
                {currentBadge === "Beginner" &&
                  "Beginner — keep teaching and collecting reviews to level up."}
              </p>
            </article>

            <article className="dashboard-text-widget dashboard-compact-widget">
              <div className="dashboard-widget-heading">
                <span>Availability Snapshot</span>
                <small>
                  {availableDaysCount} active day
                  {availableDaysCount === 1 ? "" : "s"}
                </small>
              </div>

              {availabilityPreview.length === 0 ? (
                <p>No availability added yet.</p>
              ) : (
                <div className="dashboard-availability-list">
                  {availabilityPreview.map((dayItem) => (
                    <div
                      key={dayItem.day}
                      className="dashboard-availability-card"
                    >
                      <div>
                        <strong>{dayItem.day}</strong>
                        <small>
                          {dayItem.slots.length} slot
                          {dayItem.slots.length === 1 ? "" : "s"}
                        </small>
                      </div>

                      <div className="dashboard-slot-list">
                        {dayItem.slots.map((slot, index) => (
                          <span
                            key={`${dayItem.day}-${slot.start}-${slot.end}-${index}`}
                          >
                            {formatSlotRange(slot)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        {isTutor && (
          <section className="dashboard-card">
            <div className="dashboard-section-header">
              <div>
                <h2>Recent Reviews</h2>
                <p>Feedback from learners after completed sessions.</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="dashboard-empty-state">
                No reviews yet. Completed session feedback will appear here.
              </div>
            ) : (
              <>
                {latestReview && (
                  <article className="dashboard-latest-review">
                    <span className="dashboard-kicker">Latest Feedback</span>
                    <p>
                      “
                      {latestReview.comment ||
                        "No written comment was left for this review."}
                      ”
                    </p>
                    <strong>★ {latestReview.rating}/5</strong>
                  </article>
                )}

                <div className="dashboard-review-grid">
                  {reviews.slice(0, 6).map((review) => (
                    <article key={review._id} className="dashboard-review-card">
                      <div className="dashboard-review-top">
                        <div>
                          <h3>{review.reviewer?.name || "Anonymous learner"}</h3>
                          <p>
                            {review.reviewer?.email || "No email"}
                            {review.createdAt
                              ? ` • ${new Date(
                                  review.createdAt
                                ).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>

                        <span>★ {review.rating}/5</span>
                      </div>

                      <p>
                        {review.comment ||
                          "No written comment was left for this review."}
                      </p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </section>
    </div>
  );
}

export default Dashboard;