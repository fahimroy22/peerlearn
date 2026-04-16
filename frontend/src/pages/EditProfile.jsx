import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../api/axios";
import useToast from "../context/useToast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const createEmptyAvailability = () =>
  DAYS.map((day) => ({
    day,
    slots: [],
  }));

function EditProfile() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    semester: "",
    avatar: "",
    bio: "",
    teachingStyle: "",
  });

  const [availability, setAvailability] = useState(createEmptyAvailability());

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, availabilityRes] = await Promise.all([
          api.get("/users/profile"),
          api.get(`/availability/${user?._id}`),
        ]);

        setFormData({
          name: profileRes.data.name || "",
          department: profileRes.data.department || "",
          semester: profileRes.data.semester || "",
          avatar: profileRes.data.avatar || "",
          bio: profileRes.data.bio || "",
          teachingStyle: profileRes.data.teachingStyle || "",
        });

        const fetchedAvailability = Array.isArray(availabilityRes.data)
          ? availabilityRes.data
          : [];

        const mergedAvailability = DAYS.map((day) => {
          const existing = fetchedAvailability.find((item) => item.day === day);
          return {
            day,
            slots: existing?.slots || [],
          };
        });

        setAvailability(mergedAvailability);
      } catch (error) {
        console.error("Failed to load profile", error);
        showToast("Failed to load profile", "error");
      }
    };

    if (user?._id) {
      fetchProfile();
    }
  }, [showToast, user?._id]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAvailabilityChange = (day, slotIndex, field, value) => {
    setAvailability((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              slots: item.slots.map((slot, index) =>
                index === slotIndex ? { ...slot, [field]: value } : slot
              ),
            }
          : item
      )
    );
  };

  const handleAddSlot = (day) => {
    setAvailability((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              slots: [...item.slots, { start: "", end: "" }],
            }
          : item
      )
    );
  };

  const handleRemoveSlot = (day, slotIndex) => {
    setAvailability((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              slots: item.slots.filter((_, index) => index !== slotIndex),
            }
          : item
      )
    );
  };

  const cleanAvailability = (items) =>
    items.map((item) => ({
      day: item.day,
      slots: item.slots.filter((slot) => slot.start && slot.end),
    }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const [profileRes] = await Promise.all([
        api.put("/users/profile", formData),
        api.patch("/availability", {
          availability: cleanAvailability(availability),
        }),
      ]);

      setUser((prev) => ({
        ...prev,
        ...profileRes.data.user,
      }));

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...parsed,
            ...profileRes.data.user,
          })
        );
      }

      showToast("Profile and availability updated successfully", "success");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to update profile",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const avatarPreview = useMemo(() => {
    return formData.avatar?.trim() || user?.avatar || "";
  }, [formData.avatar, user?.avatar]);

  const bioCount = formData.bio.length;
  const teachingStyleCount = formData.teachingStyle.length;

  const totalSlots = availability.reduce((sum, item) => sum + item.slots.length, 0);

  return (
    <div className="page page-with-savebar">
      <div className="listing-page-header">
        <div>
          <div className="section-eyebrow">Profile Settings</div>
          <h1 className="page-title">Edit Profile</h1>
          <p className="listing-page-subtitle">
            Update how learners see you. Add a profile image, a strong bio, a
            teaching style, and your weekly availability.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile}>
        <div className="edit-profile-layout">
          <div className="card edit-profile-sidebar">
            <h2 className="card-title">Live Preview</h2>

            <div className="edit-profile-preview-card">
              <div className="profile-avatar-wrap">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={formData.name || "Profile"}
                    className="profile-avatar profile-avatar-xl"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="profile-avatar profile-avatar-fallback profile-avatar-xl">
                    {formData.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="edit-profile-preview-name">
                {formData.name || "Your Name"}
              </div>

              <div className="edit-profile-preview-meta">
                {user?.email || "your@email.com"}
              </div>

              <div className="edit-profile-preview-badges">
                {formData.department && (
                  <span className="badge badge-blue">{formData.department}</span>
                )}
                {formData.semester && (
                  <span className="badge badge-yellow">Semester {formData.semester}</span>
                )}
                {user?.role && (
                  <span className="badge badge-green">{user.role}</span>
                )}
                {user?.badge && (
                  <span className="badge badge-blue">{user.badge}</span>
                )}
              </div>

              <div className="profile-text-block">
                <span className="listing-meta-label">Bio Preview</span>
                <p>{formData.bio || "Your short bio will appear here."}</p>
              </div>

              <div className="profile-text-block">
                <span className="listing-meta-label">Teaching Style Preview</span>
                <p>
                  {formData.teachingStyle ||
                    "Your teaching style will appear here."}
                </p>
              </div>

              <div className="profile-text-block">
                <span className="listing-meta-label">Availability Preview</span>
                <p>
                  {totalSlots > 0
                    ? `${totalSlots} weekly time slot${totalSlots > 1 ? "s" : ""} added`
                    : "No availability added yet."}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Profile Details</h2>

            <div className="form-grid">
              <div>
                <label className="label edit-label">Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-2">
                <div>
                  <label className="label edit-label">Department</label>
                  <input
                    type="text"
                    name="department"
                    placeholder="Department"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="label edit-label">Semester</label>
                  <input
                    type="text"
                    name="semester"
                    placeholder="Semester"
                    value={formData.semester}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="label edit-label">Avatar Image URL</label>
                <div className="avatar-upload-box">
                  <input
                    type="text"
                    name="avatar"
                    placeholder="Paste image URL for your avatar"
                    value={formData.avatar}
                    onChange={handleChange}
                  />
                  <div className="avatar-upload-hint">
                    Use a direct image link so your profile looks more professional.
                  </div>
                </div>
              </div>

              <div>
                <label className="label edit-label">Bio</label>
                <textarea
                  name="bio"
                  placeholder="Tell learners about your background, expertise, and what makes you a good tutor."
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={500}
                />
                <div className="text-counter">{bioCount}/500</div>
              </div>

              <div>
                <label className="label edit-label">Teaching Style</label>
                <textarea
                  name="teachingStyle"
                  placeholder="Explain how you teach. For example: patient, step-by-step, practical examples, exam-focused..."
                  value={formData.teachingStyle}
                  onChange={handleChange}
                  maxLength={300}
                />
                <div className="text-counter">{teachingStyleCount}/300</div>
              </div>
            </div>

            <div className="edit-profile-availability-section">
              <div className="edit-profile-section-header">
                <div>
                  <h3 className="edit-profile-section-title">Weekly Availability</h3>
                  <p className="edit-profile-section-copy">
                    Add the time slots when you are usually available for sessions.
                  </p>
                </div>
              </div>

              <div className="availability-editor">
                {availability.map((dayItem) => (
                  <div key={dayItem.day} className="availability-day-card">
                    <div className="availability-day-header">
                      <div className="availability-day-title">{dayItem.day}</div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => handleAddSlot(dayItem.day)}
                      >
                        Add Slot
                      </button>
                    </div>

                    {dayItem.slots.length === 0 ? (
                      <div className="availability-empty">
                        No time slots added for {dayItem.day}.
                      </div>
                    ) : (
                      <div className="availability-slot-list">
                        {dayItem.slots.map((slot, slotIndex) => (
                          <div key={`${dayItem.day}-${slotIndex}`} className="availability-slot-row">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                handleAvailabilityChange(
                                  dayItem.day,
                                  slotIndex,
                                  "start",
                                  e.target.value
                                )
                              }
                            />

                            <span className="availability-slot-separator">to</span>

                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                handleAvailabilityChange(
                                  dayItem.day,
                                  slotIndex,
                                  "end",
                                  e.target.value
                                )
                              }
                            />

                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleRemoveSlot(dayItem.day, slotIndex)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="save-bar">
          <div className="save-bar-content">
            <div>
              <div className="save-bar-title">Ready to save your profile?</div>
              <div className="save-bar-subtitle">
                Your public tutor profile and weekly availability update after saving.
              </div>
            </div>

            <div className="save-bar-actions">
              <Link to="/dashboard">
                <button type="button" className="secondary">
                  Cancel
                </button>
              </Link>

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default EditProfile;