import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import useToast from "../context/useToast";

function TutorProfile() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchTutorProfile = async () => {
      try {
        const res = await api.get(`/users/profile/${id}`);
        setProfile(res.data.user);
        setReviews(res.data.reviews || []);
      } catch (error) {
        console.error("Failed to load tutor profile", error);
        showToast("Failed to load tutor profile", "error");
      }
    };

    fetchTutorProfile();
  }, [id, showToast]);

  const getBadgeClass = (badge) => {
    if (badge === "Top Tutor") return "badge badge-green";
    if (badge === "Excellent") return "badge badge-blue";
    if (badge === "Trusted") return "badge badge-yellow";
    return "badge";
  };

  const formatTime12Hour = (time) => {
    if (!time || !time.includes(":")) return time || "";

    const [hourString, minute] = time.split(":");
    const hour = Number(hourString);

    if (Number.isNaN(hour)) return time;

    const suffix = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 || 12;

    return `${normalizedHour}:${minute} ${suffix}`;
  };

  const formatAvailability = (availability = []) => {
    return availability.filter((day) => (day.slots || []).length > 0);
  };

  if (!profile) {
    return (
      <div className="page">
        <div className="empty-state">Loading tutor profile...</div>
      </div>
    );
  }

  const badge = profile.badge || "Beginner";
  const activeAvailability = formatAvailability(profile.availability || []);

  return (
    <div className="page">
      <div className="profile-hero">
        <div className="profile-hero-main">
          <div className="section-eyebrow">Tutor Profile</div>
          <h1 className="page-title" style={{ marginBottom: "10px" }}>
            {profile.name}
          </h1>
          <p className="listing-page-subtitle">
            Review tutor details, teaching style, availability, and learner
            feedback before sending a request.
          </p>

          <div className="profile-badge-row">
            <span className={getBadgeClass(badge)}>{badge}</span>
            <span className="badge badge-blue">{profile.role}</span>
            {profile.department && (
              <span className="badge badge-yellow">{profile.department}</span>
            )}
          </div>
        </div>

        <div className="profile-hero-stats">
          <div className="profile-stat-card profile-stat-card-accent">
            <span className="profile-stat-label">Average Rating</span>
            <span className="profile-stat-value">
              {profile.ratingAvg?.toFixed?.(1) || profile.ratingAvg || 0}
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-label">Total Reviews</span>
            <span className="profile-stat-value">{profile.ratingCount || 0}</span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-label">Tutor Badge</span>
            <span className="profile-stat-value">{badge}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">Tutor Information</h2>

          <div className="profile-summary">
            <div className="profile-avatar-wrap">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar profile-avatar-fallback">
                  {profile.name?.charAt(0)?.toUpperCase() || "T"}
                </div>
              )}
            </div>

            <div className="info-list">
              <div className="info-row">
                <span className="label">Name:</span>
                <span>{profile.name}</span>
              </div>

              <div className="info-row">
                <span className="label">Email:</span>
                <span>{profile.email}</span>
              </div>

              <div className="info-row">
                <span className="label">User ID:</span>
                <span>{profile.publicId || "No ID yet"}</span>
              </div>

              <div className="info-row">
                <span className="label">Department:</span>
                <span>{profile.department || "Not set"}</span>
              </div>

              <div className="info-row">
                <span className="label">Semester:</span>
                <span>{profile.semester || "Not set"}</span>
              </div>

              <div className="info-row">
                <span className="label">Badge:</span>
                <span className={getBadgeClass(badge)}>{badge}</span>
              </div>
            </div>
          </div>

          <div className="profile-text-block">
            <span className="listing-meta-label">Bio</span>
            <p>{profile.bio || "No bio added yet."}</p>
          </div>

          <div className="profile-text-block">
            <span className="listing-meta-label">Teaching Style</span>
            <p>{profile.teachingStyle || "No teaching style added yet."}</p>
          </div>

          <div className="profile-availability-card">
            <span className="listing-meta-label">Weekly Availability</span>
            {activeAvailability.length === 0 ? (
              <p>No availability added yet.</p>
            ) : (
              <div className="profile-availability-list">
                {activeAvailability.map((dayItem) => (
                  <div key={dayItem.day} className="profile-availability-row">
                    <strong>{dayItem.day}</strong>
                    <span>
                      {(dayItem.slots || [])
                        .map(
                          (slot) =>
                            `${formatTime12Hour(slot.start)} - ${formatTime12Hour(
                              slot.end
                            )}`
                        )
                        .join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Rating Summary</h2>

          <div className="profile-rating-panel">
            <div className="profile-rating-summary">
              <span className="listing-meta-label">Overall Rating</span>
              <div className="profile-rating-main">
                ⭐ {profile.ratingAvg?.toFixed?.(1) || profile.ratingAvg || 0}
              </div>
            </div>

            <div className="info-list">
              <div className="info-row">
                <span className="label">Total Reviews:</span>
                <span>{profile.ratingCount || 0}</span>
              </div>

              <div className="info-row">
                <span className="label">Tutor Badge:</span>
                <span className={getBadgeClass(badge)}>{badge}</span>
              </div>

              <div className="info-row">
                <span className="label">Tutor Quality:</span>
                <span className="muted">
                  {profile.ratingCount > 0
                    ? "Based on completed sessions and learner reviews"
                    : "No completed reviews yet"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="card-title">Received Reviews</h2>

        {reviews.length === 0 ? (
          <div className="empty-state">No reviews yet</div>
        ) : (
          <div className="profile-review-stack">
            {reviews.map((review) => (
              <div key={review._id} className="profile-review-card">
                <div className="profile-review-top">
                  <div>
                    <h3 className="profile-review-name">
                      {review.reviewer?.name || "Anonymous learner"}
                    </h3>
                    <p className="profile-review-meta">
                      {review.reviewer?.email || "No email"}
                      {review.reviewer?.publicId
                        ? ` • ${review.reviewer.publicId}`
                        : ""}
                    </p>
                  </div>

                  <div className="profile-review-rating">⭐ {review.rating}/5</div>
                </div>

                <p className="profile-review-comment">
                  {review.comment || "No comment"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TutorProfile;