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
        setAvailability(Array.isArray(availabilityRes.data) ? availabilityRes.data : []);
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

  if (isAdmin) {
    return (
      <div className="page dashboard-page">
        <section className="dashboard-shell dashboard-shell-final">
          <section className="dashboard-welcome-strip">
            <div className="dashboard-welcome-copy">
              <div className="section-eyebrow">Admin Panel</div>
              <h1 className="dashboard-title">
                Welcome back, {currentUser?.name || "Admin"}
              </h1>
              <p className="dashboard-subtitle">
                This account is an admin account. Use the admin dashboard to manage the platform.
              </p>
            </div>

            <div className="dashboard-welcome-actions">
              <Link to="/admin">
                <button>Go to Admin Dashboard</button>
              </Link>
            </div>
          </section>
        </section>
      </div>
    );
  };
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

  const completionPercent = useMemo(() => {
    const items = [
      Boolean(currentUser?.avatar),
      Boolean(currentUser?.bio),
      Boolean(currentUser?.teachingStyle),
      Boolean(currentUser?.department),
      Boolean(currentUser?.semester),
      !isTutor || totalAvailabilitySlots > 0,
    ];

    const done = items.filter(Boolean).length;
    return Math.round((done / items.length) * 100);
  }, [currentUser, totalAvailabilitySlots, isTutor]);

  const profileReadinessText =
    completionPercent >= 80
      ? "Your profile is in strong shape and ready for discovery."
      : isTutor
      ? "Add more details and availability to improve credibility and visibility."
      : "Add more profile details to improve visibility and trust.";

  return (
    <div className="page dashboard-page">
      <section className="dashboard-shell dashboard-shell-final">
        <section className="dashboard-welcome-strip">
          <div className="dashboard-welcome-copy">
            <div className="section-eyebrow">My Dashboard</div>
            <h1 className="dashboard-title">
              Welcome back, {currentUser?.name || "User"}
            </h1>
            <p className="dashboard-subtitle">
              Keep your profile polished, monitor your account, and stay ready
              for new opportunities on PeerLearn.
            </p>
          </div>

          <div className="dashboard-welcome-actions">
            <Link to="/edit-profile">
              <button>Edit Profile</button>
            </Link>
          </div>
        </section>

        <section className="dashboard-layout-final">
          <div className="dashboard-primary-column">
            <section className="dashboard-panel dashboard-profile-panel-final">
              <div className="dashboard-profile-banner">
                <div className="dashboard-avatar-wrap">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="dashboard-avatar dashboard-avatar-hero"
                    />
                  ) : (
                    <div className="dashboard-avatar dashboard-avatar-fallback dashboard-avatar-hero">
                      {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                <div className="dashboard-profile-main">
                  <div className="dashboard-profile-main__top">
                    <div>
                      <h2 className="dashboard-profile-name">
                        {currentUser?.name || "Not set"}
                      </h2>
                      <p className="dashboard-profile-email">
                        {currentUser?.email || "No email"}
                      </p>
                    </div>

                    <div className="dashboard-profile-badges">
                      <span className="badge badge-blue">
                        {currentUser?.role || "user"}
                      </span>
                      {currentUser?.department && (
                        <span className="badge badge-yellow">
                          {currentUser.department}
                        </span>
                      )}
                      {currentUser?.semester && (
                        <span className="badge badge-green">
                          Semester {currentUser.semester}
                        </span>
                      )}
                      {isTutor && (
                        <span className="badge badge-blue">{currentBadge}</span>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-quickfacts-grid">
                    <div className="dashboard-quickfact">
                      <span className="dashboard-quickfact-label">User ID</span>
                      <strong className="dashboard-quickfact-value">
                        {currentUser?.publicId || "No ID yet"}
                      </strong>
                    </div>

                    <div className="dashboard-quickfact">
                      <span className="dashboard-quickfact-label">Account Type</span>
                      <strong className="dashboard-quickfact-value">
                        {isTutor ? "Tutor Account" : "Learner Account"}
                      </strong>
                    </div>

                    <div className="dashboard-quickfact">
                      <span className="dashboard-quickfact-label">Department</span>
                      <strong className="dashboard-quickfact-value">
                        {currentUser?.department || "Not set"}
                      </strong>
                    </div>

                    <div className="dashboard-quickfact">
                      <span className="dashboard-quickfact-label">Semester</span>
                      <strong className="dashboard-quickfact-value">
                        {currentUser?.semester || "Not set"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dashboard-content-columns">
                <div className="dashboard-content-block">
                  <span className="dashboard-content-label">Bio</span>
                  <p>{currentUser?.bio || "No bio added yet."}</p>
                </div>

                <div className="dashboard-content-block">
                  <span className="dashboard-content-label">
                    {isTutor ? "Teaching Style" : "About You"}
                  </span>
                  <p>
                    {currentUser?.teachingStyle ||
                      (isTutor
                        ? "No teaching style added yet."
                        : "No additional profile details added yet.")}
                  </p>
                </div>
              </div>

              {isTutor && (
                <div className="dashboard-content-columns">
                  <div className="dashboard-content-block">
                    <span className="dashboard-content-label">Tutor Badge</span>
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
                  </div>

                  <div className="dashboard-content-block dashboard-content-block-availability">
                    <div className="dashboard-availability-header">
                      <span className="dashboard-content-label">Availability Snapshot</span>
                      <span className="dashboard-availability-meta">
                        {availableDaysCount} active day{availableDaysCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    {availabilityPreview.length === 0 ? (
                      <p>No availability added yet.</p>
                    ) : (
                      <div className="dashboard-availability-cards">
                        {availabilityPreview.map((dayItem) => (
                          <div key={dayItem.day} className="dashboard-availability-day-card">
                            <div className="dashboard-availability-day-head">
                              <strong className="dashboard-availability-day-name">
                                {dayItem.day}
                              </strong>
                              <span className="dashboard-availability-slot-count">
                                {dayItem.slots.length} slot
                                {dayItem.slots.length === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="dashboard-availability-slot-stack">
                              {dayItem.slots.map((slot, index) => (
                                <div
                                  key={`${dayItem.day}-${slot.start}-${slot.end}-${index}`}
                                  className="dashboard-availability-slot-pill"
                                >
                                  {formatSlotRange(slot)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {isTutor && (
              <section className="dashboard-panel dashboard-reviews-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 className="dashboard-panel-title">Recent Reviews</h2>
                    <p className="dashboard-panel-subtitle">
                      Feedback from learners after completed sessions.
                    </p>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="dashboard-empty-state">
                    No reviews yet. Completed session feedback will appear here.
                  </div>
                ) : (
                  <div className="dashboard-review-grid dashboard-review-grid-final">
                    {reviews.slice(0, 6).map((review) => (
                      <article key={review._id} className="dashboard-review-card">
                        <div className="dashboard-review-top">
                          <div>
                            <h3 className="dashboard-reviewer-name">
                              {review.reviewer?.name || "Anonymous learner"}
                            </h3>
                            <p className="dashboard-reviewer-meta">
                              {review.reviewer?.email || "No email"}
                              {review.createdAt
                                ? ` • ${new Date(review.createdAt).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>

                          <div className="dashboard-review-score">
                            ★ {review.rating}/5
                          </div>
                        </div>

                        <p className="dashboard-review-comment">
                          {review.comment ||
                            "No written comment was left for this review."}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="dashboard-secondary-column">
            <section className="dashboard-panel dashboard-side-panel-final">
              <div className="dashboard-panel-header">
                <h2 className="dashboard-panel-title">Account Insights</h2>
              </div>

              <div className="dashboard-side-stack">
                {isTutor && (
                  <>
                    <div className="dashboard-side-card dashboard-side-card-featured">
                      <span className="dashboard-insight-label">Average Rating</span>
                      <strong className="dashboard-insight-main">{averageRating}</strong>
                      <span className="dashboard-insight-note">
                        Current tutor reputation
                      </span>
                    </div>

                    <div className="dashboard-side-card">
                      <span className="dashboard-insight-label">Reviews Received</span>
                      <strong className="dashboard-insight-main">{totalReviews}</strong>
                      <span className="dashboard-insight-note">Learner feedback</span>
                    </div>

                    <div className="dashboard-side-card">
                      <span className="dashboard-insight-label">Tutor Badge</span>
                      <strong className="dashboard-insight-main">{currentBadge}</strong>
                      <span className="dashboard-insight-note">
                        Current reputation tier
                      </span>
                    </div>

                    <div className="dashboard-side-card">
                      <span className="dashboard-insight-label">Availability</span>
                      <strong className="dashboard-insight-main">
                        {totalAvailabilitySlots}
                      </strong>
                      <span className="dashboard-insight-note">
                        {availableDaysCount} active day
                        {availableDaysCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </>
                )}

                {!isTutor && (
                  <>
                    <div className="dashboard-side-card dashboard-side-card-featured">
                      <span className="dashboard-insight-label">Account Role</span>
                      <strong className="dashboard-insight-main">Learner</strong>
                      <span className="dashboard-insight-note">
                        Explore tutors and send learning requests
                      </span>
                    </div>

                    <div className="dashboard-side-card">
                      <span className="dashboard-insight-label">Profile Status</span>
                      <strong className="dashboard-insight-main">Active</strong>
                      <span className="dashboard-insight-note">
                        Your account is ready to browse and request sessions
                      </span>
                    </div>
                  </>
                )}

                <div className="dashboard-side-card dashboard-side-card-accent">
                  <span className="dashboard-insight-label">Profile Readiness</span>

                  <div className="dashboard-progress-row">
                    <div className="dashboard-progress">
                      <div
                        className="dashboard-progress-bar"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <span className="dashboard-progress-value">
                      {completionPercent}%
                    </span>
                  </div>

                  <p className="dashboard-readiness-copy">
                    {profileReadinessText}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </div>
  );
}

export default Dashboard;