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
  const [isLoading, setIsLoading] = useState(true);
  const [animateCards, setAnimateCards] = useState(false);

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
    } finally {
      setIsLoading(false);
      setTimeout(() => setAnimateCards(true), 100);
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
        <div className={`dashboard-shell-modern ${animateCards ? 'animate-in' : ''}`}>
          <section className="dashboard-hero-modern">
            <div className="hero-glow"></div>
            <div className="hero-content">
              <span className="hero-badge">Admin Panel</span>
              <h1 className="hero-title">
                Welcome back, {currentUser?.name || "Admin"}
              </h1>
              <p className="hero-description">
                This account is an admin account. Use the admin dashboard to manage the platform.
              </p>
              <Link to="/admin" className="hero-cta-link">
                <button className="btn-hero">
                  Go to Admin Dashboard
                  <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

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

  if (isLoading) {
    return (
      <div className="page dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className={`dashboard-shell-modern ${animateCards ? 'animate-in' : ''}`}>
        {/* Hero Section */}
        <section className="dashboard-hero-modern">
          <div className="hero-glow"></div>
          <div className="hero-content">
            <span className="hero-badge">My Dashboard</span>
            <h1 className="hero-title">
              Welcome back, {currentUser?.name || "User"}
            </h1>
            <p className="hero-description">
              Keep your profile polished, monitor your account, and stay ready
              for new opportunities on PeerLearn.
            </p>
            <Link to="/edit-profile" className="hero-cta-link">
              <button className="btn-hero">
                Edit Profile
                <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </Link>
          </div>
        </section>

        {/* Main Grid Layout */}
        <div className="dashboard-grid-modern">
          {/* Left Column - Profile & Reviews */}
          <div className="dashboard-main-column">
            {/* Profile Card */}
            <article className="card-modern card-profile">
              <div className="card-header-modern">
                <div className="profile-header-main">
                  <div className="avatar-wrapper-modern">
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="avatar-modern"
                      />
                    ) : (
                      <div className="avatar-modern avatar-fallback">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="avatar-status-indicator"></div>
                  </div>
                  
                  <div className="profile-identity">
                    <h2 className="profile-name-modern">
                      {currentUser?.name || "Not set"}
                    </h2>
                    <p className="profile-email-modern">
                      {currentUser?.email || "No email"}
                    </p>
                    
                    <div className="badge-stack-modern">
                      <span className="badge-modern badge-primary">
                        {currentUser?.role || "user"}
                      </span>
                      {currentUser?.department && (
                        <span className="badge-modern badge-warning">
                          {currentUser.department}
                        </span>
                      )}
                      {currentUser?.semester && (
                        <span className="badge-modern badge-success">
                          Semester {currentUser.semester}
                        </span>
                      )}
                      {isTutor && (
                        <span className="badge-modern badge-gradient">
                          {currentBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="quick-stats-grid">
                <div className="stat-item-modern">
                  <div className="stat-icon-wrap stat-icon-blue">
                    <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">User ID</span>
                    <strong className="stat-value">{currentUser?.publicId || "No ID yet"}</strong>
                  </div>
                </div>

                <div className="stat-item-modern">
                  <div className="stat-icon-wrap stat-icon-purple">
                    <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Account Type</span>
                    <strong className="stat-value">{isTutor ? "Tutor" : "Learner"}</strong>
                  </div>
                </div>

                <div className="stat-item-modern">
                  <div className="stat-icon-wrap stat-icon-green">
                    <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Department</span>
                    <strong className="stat-value">{currentUser?.department || "Not set"}</strong>
                  </div>
                </div>

                <div className="stat-item-modern">
                  <div className="stat-icon-wrap stat-icon-orange">
                    <svg className="stat-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Semester</span>
                    <strong className="stat-value">{currentUser?.semester || "Not set"}</strong>
                  </div>
                </div>
              </div>

              {/* Bio and Teaching Style */}
              <div className="profile-content-sections">
                <div className="content-section-modern">
                  <h3 className="section-title-modern">
                    <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    Bio
                  </h3>
                  <p className="section-text">{currentUser?.bio || "No bio added yet."}</p>
                </div>

                <div className="content-section-modern">
                  <h3 className="section-title-modern">
                    <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    {isTutor ? "Teaching Style" : "About You"}
                  </h3>
                  <p className="section-text">
                    {currentUser?.teachingStyle ||
                      (isTutor
                        ? "No teaching style added yet."
                        : "No additional profile details added yet.")}
                  </p>
                </div>
              </div>

              {/* Tutor-specific sections */}
              {isTutor && (
                <>
                  <div className="badge-explanation-modern">
                    <div className="badge-explanation-icon">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="badge-explanation-content">
                      <h4 className="badge-explanation-title">Tutor Badge: {currentBadge}</h4>
                      <p className="badge-explanation-text">
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
                  </div>

                  {availabilityPreview.length > 0 && (
                    <div className="availability-preview-modern">
                      <div className="availability-preview-header">
                        <h3 className="section-title-modern">
                          <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Availability Snapshot
                        </h3>
                        <span className="availability-badge">
                          {availableDaysCount} active day{availableDaysCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="availability-day-grid">
                        {availabilityPreview.map((dayItem, index) => (
                          <div 
                            key={dayItem.day} 
                            className="availability-day-modern"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <div className="day-header-modern">
                              <strong className="day-name-modern">{dayItem.day}</strong>
                              <span className="slot-count-badge">
                                {dayItem.slots.length} slot{dayItem.slots.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="slot-list-modern">
                              {dayItem.slots.map((slot, slotIndex) => (
                                <div
                                  key={`${dayItem.day}-${slot.start}-${slot.end}-${slotIndex}`}
                                  className="slot-pill-modern"
                                >
                                  <svg className="slot-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                  {formatSlotRange(slot)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </article>

            {/* Reviews Section for Tutors */}
            {isTutor && (
              <article className="card-modern card-reviews">
                <div className="card-header-flex">
                  <div>
                    <h2 className="card-title-modern">
                      <svg className="title-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                      </svg>
                      Recent Reviews
                    </h2>
                    <p className="card-subtitle-modern">
                      Feedback from learners after completed sessions
                    </p>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="empty-state-modern">
                    <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p>No reviews yet. Completed session feedback will appear here.</p>
                  </div>
                ) : (
                  <div className="reviews-grid-modern">
                    {reviews.slice(0, 6).map((review, index) => (
                      <div 
                        key={review._id} 
                        className="review-card-modern"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="review-header-modern">
                          <div className="reviewer-info">
                            <div className="reviewer-avatar">
                              {review.reviewer?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <h4 className="reviewer-name">
                                {review.reviewer?.name || "Anonymous learner"}
                              </h4>
                              <p className="reviewer-meta">
                                {review.createdAt
                                  ? new Date(review.createdAt).toLocaleDateString()
                                  : "No date"}
                              </p>
                            </div>
                          </div>
                          <div className="review-rating-badge">
                            <svg className="star-icon" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {review.rating}/5
                          </div>
                        </div>
                        <p className="review-comment">
                          {review.comment || "No written comment was left for this review."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}
          </div>

          {/* Right Column - Stats & Insights */}
          <aside className="dashboard-sidebar-modern">
            <div className="sidebar-sticky">
              {/* Account Insights Card */}
              <article className="card-modern card-insights">
                <h2 className="card-title-modern">
                  <svg className="title-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Account Insights
                </h2>

                <div className="insights-grid">
                  {isTutor ? (
                    <>
                      <div className="insight-card-modern insight-card-featured">
                        <div className="insight-icon-wrap insight-icon-star">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                        <div className="insight-content">
                          <span className="insight-label">Average Rating</span>
                          <strong className="insight-value">{averageRating}</strong>
                          <span className="insight-note">Current tutor reputation</span>
                        </div>
                      </div>

                      <div className="insight-card-modern">
                        <div className="insight-icon-wrap insight-icon-reviews">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="insight-content">
                          <span className="insight-label">Reviews Received</span>
                          <strong className="insight-value">{totalReviews}</strong>
                          <span className="insight-note">Learner feedback</span>
                        </div>
                      </div>

                      <div className="insight-card-modern">
                        <div className="insight-icon-wrap insight-icon-badge">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="insight-content">
                          <span className="insight-label">Tutor Badge</span>
                          <strong className="insight-value">{currentBadge}</strong>
                          <span className="insight-note">Current reputation tier</span>
                        </div>
                      </div>

                      <div className="insight-card-modern">
                        <div className="insight-icon-wrap insight-icon-calendar">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="insight-content">
                          <span className="insight-label">Availability</span>
                          <strong className="insight-value">{totalAvailabilitySlots}</strong>
                          <span className="insight-note">
                            {availableDaysCount} active day{availableDaysCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="insight-card-modern insight-card-featured">
                        <div className="insight-icon-wrap insight-icon-user">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="insight-content">
                          <span className="insight-label">Account Role</span>
                          <strong className="insight-value">Learner</strong>
                          <span className="insight-note">Explore tutors and send requests</span>
                        </div>
                      </div>

                      <div className="insight-card-modern">
                        <div className="insight-icon-wrap insight-icon-check">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="insight-content">
                          <span className="insight-label">Profile Status</span>
                          <strong className="insight-value">Active</strong>
                          <span className="insight-note">Ready to browse and request</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </article>

              {/* Profile Readiness Card */}
              <article className="card-modern card-progress">
                <h3 className="card-title-small">
                  <svg className="title-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Profile Readiness
                </h3>

                <div className="progress-display">
                  <div className="progress-ring-wrapper">
                    <svg className="progress-ring" viewBox="0 0 120 120">
                      <circle
                        className="progress-ring-bg"
                        cx="60"
                        cy="60"
                        r="52"
                      />
                      <circle
                        className="progress-ring-fill"
                        cx="60"
                        cy="60"
                        r="52"
                        style={{
                          strokeDasharray: `${2 * Math.PI * 52}`,
                          strokeDashoffset: `${2 * Math.PI * 52 * (1 - completionPercent / 100)}`
                        }}
                      />
                      <text
                        x="60"
                        y="60"
                        className="progress-ring-text"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {completionPercent}%
                      </text>
                    </svg>
                  </div>
                  <p className="progress-description">{profileReadinessText}</p>
                </div>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;