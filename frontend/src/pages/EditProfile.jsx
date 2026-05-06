import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../api/axios";
import useToast from "../context/useToast";

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const SLOT_PRESETS = [
  { label: "Morning", start: "09:00", end: "12:00" },
  { label: "Afternoon", start: "13:00", end: "17:00" },
  { label: "Evening", start: "18:00", end: "21:00" },
  { label: "Weekend", start: "10:00", end: "12:00", weekendOnly: true },
];

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
  const [activeDay, setActiveDay] = useState("Mon");
  const [initialSnapshot, setInitialSnapshot] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    semester: "",
    avatar: "",
    bio: "",
    teachingStyle: "",
  });

  const [availability, setAvailability] = useState(createEmptyAvailability());

  const buildSnapshot = (profileData, availabilityData) =>
    JSON.stringify({
      formData: profileData,
      availability: availabilityData,
    });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, availabilityRes] = await Promise.all([
          api.get("/users/profile"),
          api.get(`/availability/${user?._id}`),
        ]);

        const nextFormData = {
          name: profileRes.data.name || "",
          department: profileRes.data.department || "",
          semester: profileRes.data.semester || "",
          avatar: profileRes.data.avatar || "",
          bio: profileRes.data.bio || "",
          teachingStyle: profileRes.data.teachingStyle || "",
        };

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

        setFormData(nextFormData);
        setAvailability(mergedAvailability);
        setInitialSnapshot(buildSnapshot(nextFormData, mergedAvailability));

        const firstActiveDay =
          mergedAvailability.find((item) => item.slots.length > 0)?.day || "Mon";
        setActiveDay(firstActiveDay);
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

  const handleAddSlot = (day, presetSlot = { start: "", end: "" }) => {
    setActiveDay(day);

    setAvailability((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              slots: [...item.slots, presetSlot],
            }
          : item
      )
    );
  };

  const handleApplyPreset = (preset) => {
    if (preset.weekendOnly) {
      ["Sat", "Sun"].forEach((day) => {
        handleAddSlot(day, { start: preset.start, end: preset.end });
      });
      setActiveDay("Sat");
      return;
    }

    handleAddSlot(activeDay, { start: preset.start, end: preset.end });
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
      const cleanedAvailability = cleanAvailability(availability);

      const [profileRes] = await Promise.all([
        api.put("/users/profile", formData),
        api.patch("/availability", {
          availability: cleanedAvailability,
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

      setInitialSnapshot(buildSnapshot(formData, availability));
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

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const avatarPreview = useMemo(() => {
    return formData.avatar?.trim() || user?.avatar || "";
  }, [formData.avatar, user?.avatar]);

  const bioCount = formData.bio.length;
  const teachingStyleCount = formData.teachingStyle.length;

  const totalSlots = useMemo(() => {
    return availability.reduce((sum, item) => sum + item.slots.length, 0);
  }, [availability]);

  const currentSnapshot = useMemo(() => {
    return buildSnapshot(formData, availability);
  }, [formData, availability]);

  const hasUnsavedChanges = initialSnapshot && currentSnapshot !== initialSnapshot;

  const activeDayData =
    availability.find((item) => item.day === activeDay) || availability[0];

  const completedItems = [
    { label: "Name", done: Boolean(formData.name.trim()) },
    { label: "Department", done: Boolean(formData.department.trim()) },
    { label: "Semester", done: Boolean(formData.semester.trim()) },
    { label: "Avatar", done: Boolean(avatarPreview) },
    { label: "Bio", done: Boolean(formData.bio.trim()) },
    { label: "Teaching style", done: Boolean(formData.teachingStyle.trim()) },
    { label: "Availability", done: totalSlots > 0 },
  ];

  return (
    <div className="page page-with-savebar edit-profile-page">
      <section className="edit-profile-shell">
        <section className="edit-profile-hero">
          <div className="edit-profile-hero-copy">
            <span className="edit-profile-kicker">Profile Settings</span>
            <h1>Edit Profile</h1>
            <p>
              Refine how learners see you. Update your identity, academic
              details, teaching style, and weekly availability in one clean
              workspace.
            </p>
          </div>

          <div className="edit-profile-hero-actions">
            <Link to="/dashboard" className="edit-profile-secondary-link">
              Back to Dashboard
            </Link>
          </div>
        </section>

        <nav className="edit-profile-section-nav" aria-label="Profile sections">
          <button type="button" onClick={() => scrollToSection("preview")}>
            Preview
          </button>
          <button type="button" onClick={() => scrollToSection("details")}>
            Profile
          </button>
          <button type="button" onClick={() => scrollToSection("bio")}>
            Bio
          </button>
          <button type="button" onClick={() => scrollToSection("availability")}>
            Availability
          </button>

          <span className={hasUnsavedChanges ? "is-unsaved" : "is-saved"}>
            {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
          </span>
        </nav>

        <form onSubmit={handleSaveProfile}>
          <div className="edit-profile-layout">
            <section
              id="preview"
              className="edit-profile-card edit-profile-preview-card"
            >
              <div className="edit-profile-preview-left">
                <div className="edit-profile-card-header">
                  <div>
                    <span className="edit-profile-kicker">Live Preview</span>
                    <h2>Public Profile</h2>
                  </div>
                </div>

                <div className="edit-profile-preview-identity">
                  <div className="edit-profile-avatar-ring">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={formData.name || "Profile"}
                        className="edit-profile-avatar"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="edit-profile-avatar edit-profile-avatar-fallback">
                        {formData.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>

                  <div className="edit-profile-preview-main">
                    <h3>{formData.name || "Your Name"}</h3>
                    <p>{user?.email || "your@email.com"}</p>

                    <div className="edit-profile-chip-row">
                      {formData.department && (
                        <span className="edit-profile-chip">
                          {formData.department}
                        </span>
                      )}
                      {formData.semester && (
                        <span className="edit-profile-chip">
                          Semester {formData.semester}
                        </span>
                      )}
                      {user?.role && (
                        <span className="edit-profile-chip">{user.role}</span>
                      )}
                      {user?.badge && (
                        <span className="edit-profile-chip accent">
                          {user.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="edit-profile-preview-stack">
                <article className="edit-profile-mini-widget">
                  <span>Bio Preview</span>
                  <p>{formData.bio || "Your short bio will appear here."}</p>
                </article>

                <article className="edit-profile-mini-widget">
                  <span>Teaching Style Preview</span>
                  <p>
                    {formData.teachingStyle ||
                      "Your teaching style will appear here."}
                  </p>
                </article>

                <article className="edit-profile-mini-widget">
                  <span>Availability Preview</span>
                  <p>
                    {totalSlots > 0
                      ? `${totalSlots} weekly time slot${
                          totalSlots > 1 ? "s" : ""
                        } added`
                      : "No availability added yet."}
                  </p>
                </article>
              </div>

              <div className="edit-profile-checklist">
                <span className="edit-profile-kicker">Completion Checklist</span>

                <div className="edit-profile-checklist-grid">
                  {completedItems.map((item) => (
                    <div
                      key={item.label}
                      className={item.done ? "is-complete" : "is-missing"}
                    >
                      <span>{item.done ? "✓" : "×"}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <main className="edit-profile-main">
              <section id="details" className="edit-profile-card">
                <div className="edit-profile-card-header">
                  <div>
                    <span className="edit-profile-kicker">Profile Details</span>
                    <h2>Basic Information</h2>
                    <p>
                      Keep this information clear, accurate, and easy for
                      learners to scan.
                    </p>
                  </div>
                </div>

                <div className="edit-profile-form-grid">
                  <div className="edit-profile-field">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="edit-profile-two-column">
                    <div className="edit-profile-field">
                      <label>Department</label>
                      <input
                        type="text"
                        name="department"
                        placeholder="Department"
                        value={formData.department}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="edit-profile-field">
                      <label>Semester</label>
                      <input
                        type="text"
                        name="semester"
                        placeholder="Semester"
                        value={formData.semester}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="edit-profile-field">
                    <label>Avatar Image URL</label>
                    <div className="edit-profile-upload-box">
                      <input
                        type="text"
                        name="avatar"
                        placeholder="Paste image URL for your avatar"
                        value={formData.avatar}
                        onChange={handleChange}
                      />
                      <p>
                        Use a direct image link for a sharper, more professional
                        profile preview.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="bio" className="edit-profile-card">
                <div className="edit-profile-card-header">
                  <div>
                    <span className="edit-profile-kicker">Profile Story</span>
                    <h2>Bio & Teaching Style</h2>
                    <p>
                      Help learners understand your background, approach, and
                      teaching personality.
                    </p>
                  </div>
                </div>

                <div className="edit-profile-form-grid">
                  <div className="edit-profile-field">
                    <div className="edit-profile-label-row">
                      <label>Bio</label>
                      <span>{bioCount}/500</span>
                    </div>
                    <textarea
                      name="bio"
                      placeholder="Tell learners about your background, expertise, and what makes you a good tutor."
                      value={formData.bio}
                      onChange={handleChange}
                      maxLength={500}
                    />
                  </div>

                  <div className="edit-profile-field">
                    <div className="edit-profile-label-row">
                      <label>Teaching Style</label>
                      <span>{teachingStyleCount}/300</span>
                    </div>
                    <textarea
                      name="teachingStyle"
                      placeholder="Explain how you teach. For example: patient, step-by-step, practical examples, exam-focused..."
                      value={formData.teachingStyle}
                      onChange={handleChange}
                      maxLength={300}
                    />
                  </div>
                </div>
              </section>

              <section id="availability" className="edit-profile-card">
                <div className="edit-profile-card-header">
                  <div>
                    <span className="edit-profile-kicker">
                      Weekly Availability
                    </span>
                    <h2>Session Schedule</h2>
                    <p>
                      Add the weekly time slots when you are usually available
                      for learners.
                    </p>
                  </div>

                  <div className="edit-profile-total-pill">
                    {totalSlots} slot{totalSlots === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="edit-profile-preset-row">
                  {SLOT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                <div className="edit-profile-availability-accordion">
                  <div className="edit-profile-day-list">
                    {availability.map((dayItem) => (
                      <button
                        key={dayItem.day}
                        type="button"
                        className={
                          activeDay === dayItem.day
                            ? "edit-profile-day-tab active"
                            : "edit-profile-day-tab"
                        }
                        onClick={() => setActiveDay(dayItem.day)}
                      >
                        <strong>{dayItem.day}</strong>
                        <span>
                          {dayItem.slots.length === 0
                            ? "No slots"
                            : `${dayItem.slots.length} slot${
                                dayItem.slots.length === 1 ? "" : "s"
                              }`}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="edit-profile-active-day-panel">
                    <div className="edit-profile-active-day-header">
                      <div>
                        <h3>{activeDayData.day}</h3>
                        <p>
                          {activeDayData.slots.length === 0
                            ? "No availability set for this day."
                            : `${activeDayData.slots.length} slot${
                                activeDayData.slots.length === 1 ? "" : "s"
                              } available.`}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="edit-profile-small-action"
                        onClick={() => handleAddSlot(activeDayData.day)}
                      >
                        Add Slot
                      </button>
                    </div>

                    {activeDayData.slots.length === 0 ? (
                      <div className="edit-profile-empty-slot">
                        No time slots added for {activeDayData.day}.
                      </div>
                    ) : (
                      <div className="edit-profile-slot-list">
                        {activeDayData.slots.map((slot, slotIndex) => (
                          <div
                            key={`${activeDayData.day}-${slotIndex}`}
                            className="edit-profile-slot-row"
                          >
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                handleAvailabilityChange(
                                  activeDayData.day,
                                  slotIndex,
                                  "start",
                                  e.target.value
                                )
                              }
                            />

                            <span>to</span>

                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                handleAvailabilityChange(
                                  activeDayData.day,
                                  slotIndex,
                                  "end",
                                  e.target.value
                                )
                              }
                            />

                            <button
                              type="button"
                              className="edit-profile-remove-action"
                              onClick={() =>
                                handleRemoveSlot(activeDayData.day, slotIndex)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </main>
          </div>

          <div className="edit-profile-savebar">
            <div className="edit-profile-savebar-content">
              <div>
                <strong>
                  {hasUnsavedChanges
                    ? "You have unsaved changes"
                    : "Profile is up to date"}
                </strong>
                <p>
                  Your public profile and weekly availability will update after
                  saving.
                </p>
              </div>

              <div className="edit-profile-savebar-actions">
                <Link to="/dashboard" className="edit-profile-cancel-action">
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="edit-profile-save-action"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default EditProfile;