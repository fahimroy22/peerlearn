import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import useToast from "../context/useToast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    if (badge === "Top Tutor") return "tutor-profile-chip accent";
    if (badge === "Excellent") return "tutor-profile-chip accent";
    if (badge === "Trusted") return "tutor-profile-chip warm";
    return "tutor-profile-chip";
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

  const ratingValue = useMemo(() => {
    if (!profile) return 0;
    return profile.ratingAvg?.toFixed?.(1) || profile.ratingAvg || 0;
  }, [profile]);

  const weeklyAvailability = useMemo(() => {
    if (!profile) return [];

    return DAYS.map((day) => {
      const existing = profile.availability?.find((item) => item.day === day);
      return {
        day,
        slots: existing?.slots || [],
      };
    });
  }, [profile]);

  const activeAvailability = weeklyAvailability.filter(
    (day) => day.slots.length > 0
  );

  if (!profile) {
    return (
      <div className="page tutor-profile-page">
        <div className="tutor-profile-empty">Loading tutor profile...</div>
      </div>
    );
  }

  const badge = profile.badge || "Beginner";
  const totalReviews = profile.ratingCount || 0;

  return (
    <div className="page tutor-profile-page">
      <section className="tutor-profile-shell">
        <section className="tutor-profile-hero">
          <div className="tutor-profile-hero-copy">
            <span className="tutor-profile-kicker">Tutor Profile</span>
            <h1>{profile.name}</h1>
            <p>
              Review tutor details, teaching style, availability, and learner
              feedback before sending a request.
            </p>

            <div className="tutor-profile-chip-row">
              <span className={getBadgeClass(badge)}>{badge}</span>
              <span className="tutor-profile-chip">{profile.role}</span>
              {profile.department && (
                <span className="tutor-profile-chip">{profile.department}</span>
              )}
              {profile.semester && (
                <span className="tutor-profile-chip">
                  Semester {profile.semester}
                </span>
              )}
            </div>
          </div>

          <div className="tutor-profile-hero-stats">
            <article>
              <span>Rating</span>
              <strong>{ratingValue}</strong>
              <small>Average score</small>
            </article>

            <article>
              <span>Reviews</span>
              <strong>{totalReviews}</strong>
              <small>Learner feedback</small>
            </article>

            <article>
              <span>Badge</span>
              <strong>{badge}</strong>
              <small>Tutor tier</small>
            </article>
          </div>
        </section>

        <section className="tutor-profile-top-grid">
          <section className="tutor-profile-card tutor-profile-identity-card">
            <div className="tutor-profile-avatar-ring">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="tutor-profile-avatar"
                />
              ) : (
                <div className="tutor-profile-avatar tutor-profile-avatar-fallback">
                  {profile.name?.charAt(0)?.toUpperCase() || "T"}
                </div>
              )}
            </div>

            <div className="tutor-profile-identity-content">
              <div className="tutor-profile-identity-header">
                <div>
                  <span className="tutor-profile-kicker">Tutor Information</span>
                  <h2>{profile.name}</h2>
                  <p>{profile.email}</p>
                </div>

                <span className={getBadgeClass(badge)}>{badge}</span>
              </div>

              <div className="tutor-profile-info-grid">
                <div>
                  <span>User ID</span>
                  <strong>{profile.publicId || "No ID yet"}</strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>{profile.department || "Not set"}</strong>
                </div>

                <div>
                  <span>Semester</span>
                  <strong>{profile.semester || "Not set"}</strong>
                </div>

                <div>
                  <span>Account Type</span>
                  <strong>Tutor Account</strong>
                </div>
              </div>

              <div className="tutor-profile-text-grid">
                <article className="tutor-profile-text-widget">
                  <span>Bio</span>
                  <p>{profile.bio || "No bio added yet."}</p>
                </article>

                <article className="tutor-profile-text-widget">
                  <span>Teaching Style</span>
                  <p>{profile.teachingStyle || "No teaching style added yet."}</p>
                </article>
              </div>
            </div>
          </section>

          <aside className="tutor-profile-card tutor-profile-rating-card">
            <div>
              <span className="tutor-profile-kicker">Rating Summary</span>
              <h2>{ratingValue}</h2>
              <p>
                {totalReviews > 0
                  ? "Based on completed sessions and learner reviews."
                  : "No completed reviews yet."}
              </p>
            </div>

            <div className="tutor-profile-rating-compact">
              <div className="tutor-profile-rating-ring">
                <strong>★</strong>
                <span>{ratingValue}/5</span>
              </div>

              <div className="tutor-profile-rating-list">
                <div>
                  <span>Total Reviews</span>
                  <strong>{totalReviews}</strong>
                </div>

                <div>
                  <span>Tutor Badge</span>
                  <strong>{badge}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{totalReviews > 0 ? "Reviewed" : "New Tutor"}</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="tutor-profile-card">
          <div className="tutor-profile-card-header">
            <div>
              <span className="tutor-profile-kicker">Weekly Availability</span>
              <h2>Available Times</h2>
              <p>Times this tutor has marked as available for sessions.</p>
            </div>
          </div>

          {activeAvailability.length === 0 ? (
            <div className="tutor-profile-empty">No availability added yet.</div>
          ) : (
            <div className="tutor-profile-week-grid">
              {weeklyAvailability.map((dayItem) => (
                <div
                  key={dayItem.day}
                  className={
                    dayItem.slots.length > 0
                      ? "tutor-profile-week-card active"
                      : "tutor-profile-week-card"
                  }
                >
                  <div className="tutor-profile-week-head">
                    <strong>{dayItem.day}</strong>
                    <span>
                      {dayItem.slots.length > 0
                        ? `${dayItem.slots.length} slot${
                            dayItem.slots.length === 1 ? "" : "s"
                          }`
                        : "No slots"}
                    </span>
                  </div>

                  {dayItem.slots.length > 0 ? (
                    <div className="tutor-profile-time-list">
                      {dayItem.slots.map((slot, index) => (
                        <small key={`${dayItem.day}-${index}`}>
                          {formatTime12Hour(slot.start)} -{" "}
                          {formatTime12Hour(slot.end)}
                        </small>
                      ))}
                    </div>
                  ) : (
                    <em>—</em>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="tutor-profile-card">
          <div className="tutor-profile-card-header">
            <div>
              <span className="tutor-profile-kicker">Learner Feedback</span>
              <h2>Reviews</h2>
              <p>What learners shared after completed sessions.</p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="tutor-profile-empty">No reviews yet.</div>
          ) : (
            <div className="tutor-profile-review-grid">
              {reviews.map((review) => (
                <article key={review._id} className="tutor-profile-review-card">
                  <div className="tutor-profile-review-top">
                    <div>
                      <h3>{review.reviewer?.name || "Anonymous learner"}</h3>
                      <p>
                        {review.reviewer?.email || "No email"}
                        {review.reviewer?.publicId
                          ? ` • ${review.reviewer.publicId}`
                          : ""}
                      </p>
                    </div>

                    <strong>★ {review.rating}/5</strong>
                  </div>

                  <p>{review.comment || "No comment"}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

export default TutorProfile;