import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import ConfirmModal from "../components/ConfirmModal";

function Listings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (user?.isAdmin) {
    return <Navigate to="/admin/listings" replace />;
  }

  const [listings, setListings] = useState([]);
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [loadingRequestId, setLoadingRequestId] = useState("");
  const [deletingListingId, setDeletingListingId] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    skillName: "",
    description: "",
    level: "beginner",
    mode: "online",
    price: "",
  });

  const fetchListings = async () => {
    try {
      const [listingsRes, sentRequestsRes] = await Promise.all([
        api.get("/listings"),
        user ? api.get("/requests/my-sent") : Promise.resolve({ data: [] }),
      ]);

      setListings(listingsRes.data || []);

      const requestedListingIds = new Set(
        (sentRequestsRes.data || []).map((req) => req.listing?._id).filter(Boolean)
      );

      setRequestedIds(requestedListingIds);
    } catch (error) {
      console.error("Failed to load listings", error);
      setPageMessage("Failed to load tutor listings");
      showToast("Failed to load tutor listings", "error");
    }
  };

  useEffect(() => {
    fetchListings();
  }, [user]);

  const filteredListings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return listings;

    const filtered = listings.filter((listing) => {
      const availabilityText = (listing.tutor?.availability || [])
        .map((dayItem) =>
          `${dayItem.day} ${(dayItem.slots || [])
            .map((slot) => `${slot.start}-${slot.end}`)
            .join(" ")}`
        )
        .join(" ");

      const searchableText = [
        listing.skillName,
        listing.description,
        listing.level,
        listing.mode,
        String(listing.price ?? ""),
        listing.tutor?.name,
        listing.tutor?.email,
        listing.tutor?.publicId,
        listing.tutor?.badge,
        String(listing.tutor?.ratingAvg ?? ""),
        String(listing.tutor?.ratingCount ?? ""),
        availabilityText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });

    return filtered.sort((a, b) => {
      const aId = String(a.tutor?.publicId || "").toLowerCase();
      const bId = String(b.tutor?.publicId || "").toLowerCase();
      const aExact = aId === q ? 1 : 0;
      const bExact = bId === q ? 1 : 0;
      return bExact - aExact;
    });
  }, [listings, searchTerm]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      await api.post("/listings", {
        ...formData,
        price: Number(formData.price) || 0,
      });
      setFormData({
        skillName: "",
        description: "",
        level: "beginner",
        mode: "online",
        price: "",
      });
      setShowCreateForm(false);
      setPageMessage("Tutor listing created successfully");
      showToast("Tutor listing created successfully", "success");
      fetchListings();
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || "Failed to create listing";
      setPageMessage(message);
      showToast(message, "error");
    }
  };

  const handleDeleteListing = (listingId) => {
    setSelectedListingId(listingId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedListingId) return;
    try {
      setDeletingListingId(selectedListingId);
      await api.delete(`/listings/${selectedListingId}`);
      setListings((prev) => prev.filter((listing) => listing._id !== selectedListingId));
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedListingId);
        return next;
      });
      if (selectedListing?._id === selectedListingId) {
        setShowDetailsModal(false);
        setSelectedListing(null);
      }
      setPageMessage("Tutor listing deleted successfully");
      showToast("Tutor listing deleted successfully", "success");
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || "Failed to delete listing";
      setPageMessage(message);
      showToast(message, "error");
    } finally {
      setDeletingListingId("");
      setShowDeleteModal(false);
      setSelectedListingId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingListingId) return;
    setShowDeleteModal(false);
    setSelectedListingId(null);
  };

  const openDetailsModal = (listing) => {
    setSelectedListing(listing);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedListing(null);
  };

  const handleRequest = async (listingId) => {
    if (!user) {
      showToast("Please log in to send a request", "error");
      return;
    }

    setLoadingRequestId(listingId);
    setPageMessage("");

    try {
      await api.post("/requests", {
        listingId,
        message: "I would like to learn this skill",
      });

      setRequestedIds((prev) => new Set([...prev, listingId]));
      showToast("Request sent successfully", "success");
    } catch (error) {
      console.error(error);

      if (error.response?.data?.message === "Request already sent") {
        setRequestedIds((prev) => new Set([...prev, listingId]));
        showToast("Request already sent", "info");
      } else {
        const message = error.response?.data?.message || "Failed to send request";
        setPageMessage(message);
        showToast(message, "error");
      }
    } finally {
      setLoadingRequestId("");
    }
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

  const getAvailabilityLines = (availability = []) => {
    const activeDays = availability.filter((day) => (day.slots || []).length > 0);
    if (activeDays.length === 0) return ["No availability added"];
    return activeDays.map((day) => {
      const slots = (day.slots || [])
        .map((slot) => `${formatTime12Hour(slot.start)}-${formatTime12Hour(slot.end)}`)
        .join(", ");
      return `${day.day}: ${slots}`;
    });
  };

  const getBadgeClass = (badge) => {
    if (badge === "Top Tutor") return "listing-level-badge listing-badge-top";
    if (badge === "Excellent") return "listing-level-badge listing-badge-excellent";
    if (badge === "Trusted") return "listing-level-badge listing-badge-trusted";
    return "listing-level-badge listing-badge-default";
  };

  const getTutorInitials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "T";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  const selectedIsOwnListing =
    !!user && !!selectedListing && user._id === selectedListing.tutor?._id;
  const selectedAlreadyRequested = !!selectedListing && requestedIds.has(selectedListing._id);
  const selectedIsLoading = !!selectedListing && loadingRequestId === selectedListing._id;
  const selectedIsDeleting = !!selectedListing && deletingListingId === selectedListing._id;
  const selectedAvailabilityLines = selectedListing
    ? getAvailabilityLines(selectedListing.tutor?.availability || [])
    : [];

  const totalListings = listings.length;
  const freeListings = listings.filter((listing) => Number(listing.price || 0) === 0).length;
  const onlineListings = listings.filter((listing) =>
    ["online", "both"].includes(listing.mode)
  ).length;

  const ListingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 12H16M8 16H13M8 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="page listings-page">
      <div className="listings-hero">
        <div className="listings-hero-content">
          <div className="listings-hero-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8 12H16M8 16H13M8 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="listings-hero-title">Tutor Listings</h1>
          <p className="listings-hero-subtitle">
            Compare tutors by skill, level, mode, price, rating, and availability before sending a request.
          </p>
        </div>

        <div className="listings-stats">
          <div className="listing-stat-card listing-stat-primary">
            <div className="listing-stat-icon">
              <ListingIcon />
            </div>
            <div className="listing-stat-content">
              <div className="listing-stat-value">{totalListings}</div>
              <div className="listing-stat-label">Total Tutors</div>
            </div>
          </div>

          <div className="listing-stat-card listing-stat-info">
            <div className="listing-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 8L9.17 12.55C10.74 13.55 13.24 13.55 14.81 12.55L21.94 8.02" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="listing-stat-content">
              <div className="listing-stat-value">{onlineListings}</div>
              <div className="listing-stat-label">Online Available</div>
            </div>
          </div>

          <div className="listing-stat-card listing-stat-success">
            <div className="listing-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="listing-stat-content">
              <div className="listing-stat-value">{freeListings}</div>
              <div className="listing-stat-label">Free Listings</div>
            </div>
          </div>
        </div>
      </div>

      <div className="listings-controls">
        <div className="listings-search-box">
          <span className="listings-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by skill, tutor name, email, or Student ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="listings-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="listings-search-clear"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {user?.role === "tutor" && (
          <button
            className={`listing-create-toggle ${showCreateForm ? "active" : ""}`}
            onClick={() => setShowCreateForm((p) => !p)}
          >
            {showCreateForm ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Create Listing
              </>
            )}
          </button>
        )}
      </div>

      {pageMessage && <div className="listing-page-message">{pageMessage}</div>}

      {user?.role === "tutor" && showCreateForm && (
        <div className="listing-create-panel">
          <div className="listing-panel-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <div>
              <h2 className="listing-panel-title">Create Tutor Listing</h2>
              <p className="listing-panel-subtitle">Fill in your skill details to be discovered by learners.</p>
            </div>
          </div>

          <form className="listing-create-form" onSubmit={handleCreateListing}>
            <div className="listing-form-grid">
              <div className="listing-form-field">
                <label>Skill Name</label>
                <input
                  type="text"
                  name="skillName"
                  placeholder="e.g. Data Structures, Calculus…"
                  value={formData.skillName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="listing-form-field">
                <label>Price (৳)</label>
                <input
                  type="number"
                  name="price"
                  placeholder="0 = Free"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>

              <div className="listing-form-field listing-form-field-full">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Describe what you can teach…"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                />
              </div>

              <div className="listing-form-field">
                <label>Level</label>
                <select name="level" value={formData.level} onChange={handleChange}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="listing-form-field">
                <label>Mode</label>
                <select name="mode" value={formData.mode} onChange={handleChange}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            <div className="listing-form-actions">
              <button type="submit" className="listing-panel-submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                Publish Listing
              </button>
              <button
                type="button"
                className="listing-action-btn listing-action-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="listing-results-meta">
        <span>
          <strong>{filteredListings.length}</strong> of <strong>{listings.length}</strong> tutors
        </span>
        {searchTerm && (
          <span>
            for <em>"{searchTerm}"</em>
          </span>
        )}
      </div>

      {filteredListings.length === 0 ? (
        <div className="listings-empty">
          <div className="listings-empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="listings-empty-title">No listings found</h3>
          <p className="listings-empty-text">Try a different search term or clear the filter.</p>
          {searchTerm && (
            <button className="listing-action-btn listing-action-secondary" onClick={() => setSearchTerm("")}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="listings-grid">
          {filteredListings.map((listing, idx) => {
            const alreadyRequested = requestedIds.has(listing._id);
            const isOwnListing = user && user._id === listing.tutor?._id;
            const isLoading = loadingRequestId === listing._id;
            const isDeleting = deletingListingId === listing._id;
            const tutorBadge = listing.tutor?.badge || "Beginner";
            const tutorName = listing.tutor?.name || "Tutor";
            const availabilityLines = getAvailabilityLines(listing.tutor?.availability || []);

            return (
              <article
                key={listing._id}
                className="listing-card listing-card-animate"
                style={{ "--card-i": idx }}
              >
                <div className="listing-card-glow"></div>

                <div className="listing-card-header">
                  <div className="listing-header-top">
                    <div className="listing-tutor-block">
                      {listing.tutor?.avatar ? (
                        <img src={listing.tutor.avatar} alt={tutorName} className="listing-avatar" />
                      ) : (
                        <div className="listing-avatar listing-avatar-initials">
                          {getTutorInitials(tutorName)}
                        </div>
                      )}

                      <div className="listing-tutor-info">
                        <span className="listing-tutor-name">{tutorName}</span>
                        <span className="listing-tutor-id">{listing.tutor?.publicId || "No ID yet"}</span>
                      </div>
                    </div>

                    <span className={getBadgeClass(tutorBadge)}>{tutorBadge}</span>
                  </div>

                  <h2 className="listing-title-new">{listing.skillName}</h2>
                  <p className="listing-subtitle-new">
                    {listing.description?.length > 105
                      ? `${listing.description.slice(0, 105)}…`
                      : listing.description}
                  </p>

                  <div className="listing-badges-cluster">
                    <span className="listing-type-badge">{listing.level}</span>
                    <span className="listing-mode-badge">{listing.mode}</span>
                  </div>
                </div>

                <div className="listing-quick-info">
                  <div className="listing-info-item listing-info-primary">
                    <div className="listing-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M13.73 3.51L15.49 7.03C15.73 7.52 16.37 7.99 16.91 8.08L20.1 8.61C22.14 8.95 22.62 10.43 21.15 11.89L18.67 14.37C18.25 14.79 18.02 15.6 18.15 16.18L18.86 19.25C19.42 21.68 18.13 22.62 15.98 21.35L12.99 19.58C12.45 19.26 11.56 19.26 11.01 19.58L8.02 21.35C5.88 22.62 4.58 21.67 5.14 19.25L5.85 16.18C5.98 15.6 5.75 14.79 5.33 14.37L2.85 11.89C1.39 10.43 1.86 8.95 3.9 8.61L7.09 8.08C7.62 7.99 8.26 7.52 8.5 7.03L10.26 3.51C11.22 1.6 12.78 1.6 13.73 3.51Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="listing-info-content">
                      <span className="listing-info-label">Rating</span>
                      <span className="listing-info-value">
                        {listing.tutor?.ratingAvg?.toFixed?.(1) ?? "0.0"}
                        <span className="listing-info-muted"> ({listing.tutor?.ratingCount ?? 0})</span>
                      </span>
                    </div>
                  </div>

                  <div className="listing-info-item">
                    <div className="listing-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2V22M17 5.5H9.5C8.12 5.5 7 6.62 7 8C7 9.38 8.12 10.5 9.5 10.5H14.5C15.88 10.5 17 11.62 17 13C17 14.38 15.88 15.5 14.5 15.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="listing-info-content">
                      <span className="listing-info-label">Price</span>
                      <span className="listing-info-value">
                        {listing.price > 0 ? `৳ ${listing.price}` : "Free"}
                      </span>
                    </div>
                  </div>

                  <div className="listing-info-item">
                    <div className="listing-info-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="listing-info-content">
                      <span className="listing-info-label">Availability</span>
                      <span className="listing-info-value">{availabilityLines[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="listing-actions-row">
                  <div className="listing-actions-left">
                    <button
                      className="listing-link-btn"
                      type="button"
                      onClick={() => openDetailsModal(listing)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 13C12.55 13 13 12.55 13 12C13 11.45 12.55 11 12 11C11.45 11 11 11.45 11 12C11 12.55 11.45 13 12 13Z" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M21 12C19 15.5 16 17.5 12 17.5C8 17.5 5 15.5 3 12C5 8.5 8 6.5 12 6.5C16 6.5 19 8.5 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Details
                    </button>

                    <Link className="listing-link-btn" to={`/tutor-profile/${listing.tutor?._id}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Profile
                    </Link>
                  </div>

                  <div className="listing-actions-right">
                    {!user ? (
                      <div className="listing-notice">Sign in to send a request.</div>
                    ) : !isOwnListing ? (
                      <button
                        className={`listing-action-btn listing-action-primary ${alreadyRequested ? "is-done" : ""}`}
                        onClick={() => handleRequest(listing._id)}
                        disabled={alreadyRequested || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span className="listing-spinner" />
                            Sending...
                          </>
                        ) : alreadyRequested ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Requested
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Request
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        className="listing-action-btn listing-action-danger"
                        onClick={() => handleDeleteListing(listing._id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <span className="listing-spinner listing-spinner-red" />
                            Deleting...
                          </>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showDetailsModal && selectedListing && (
        <div className="listing-modal-overlay" onClick={closeDetailsModal}>
          <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="listing-modal-head">
              <div className="listing-modal-tutor-row">
                {selectedListing.tutor?.avatar ? (
                  <img src={selectedListing.tutor.avatar} alt="" className="listing-modal-avatar" />
                ) : (
                  <div className="listing-modal-avatar listing-avatar-initials">
                    {getTutorInitials(selectedListing.tutor?.name || "")}
                  </div>
                )}
                <div>
                  <div className="listing-modal-tutor-name">{selectedListing.tutor?.name}</div>
                  <div className="listing-modal-tutor-id">{selectedListing.tutor?.publicId || "—"}</div>
                </div>
              </div>

              <button className="listing-modal-close" onClick={closeDetailsModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <h2 className="listing-modal-title">{selectedListing.skillName}</h2>

            <div className="listing-modal-tags">
              <span className="listing-type-badge">{selectedListing.level}</span>
              <span className="listing-mode-badge">{selectedListing.mode}</span>
              <span className={getBadgeClass(selectedListing.tutor?.badge || "Beginner")}>
                {selectedListing.tutor?.badge || "Beginner"}
              </span>
            </div>

            <div className="listing-modal-section">
              <div className="listing-modal-label">Description</div>
              <p className="listing-modal-text">{selectedListing.description}</p>
            </div>

            <div className="listing-modal-grid">
              {[
                {
                  label: "Price",
                  val: selectedListing.price > 0 ? `৳ ${selectedListing.price}` : "Free / Negotiable",
                },
                {
                  label: "Rating",
                  val: `⭐ ${selectedListing.tutor?.ratingAvg?.toFixed?.(1) ?? 0}`,
                },
                { label: "Reviews", val: selectedListing.tutor?.ratingCount ?? 0 },
                { label: "Student ID", val: selectedListing.tutor?.publicId || "No ID yet" },
              ].map(({ label, val }) => (
                <div key={label} className="listing-modal-stat">
                  <span className="listing-modal-stat-label">{label}</span>
                  <span className="listing-modal-stat-value">{val}</span>
                </div>
              ))}
            </div>

            <div className="listing-modal-section">
              <div className="listing-modal-label">Email</div>
              <p className="listing-modal-text">{selectedListing.tutor?.email}</p>
            </div>

            <div className="listing-modal-section">
              <div className="listing-modal-label">Availability</div>
              <div className="listing-availability-list">
                {selectedAvailabilityLines.map((line, i) => (
                  <div key={`${line}-${i}`} className="listing-availability-row">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="listing-modal-footer">
              <Link
                className="listing-link-btn listing-modal-action"
                to={`/tutor-profile/${selectedListing.tutor?._id}`}
                onClick={closeDetailsModal}
              >
                View Full Profile
              </Link>

              {!user ? (
                <div className="listing-notice">Sign in to send a request.</div>
              ) : !selectedIsOwnListing ? (
                <button
                  className={`listing-action-btn listing-action-primary listing-modal-action ${
                    selectedAlreadyRequested ? "is-done" : ""
                  }`}
                  onClick={() => handleRequest(selectedListing._id)}
                  disabled={selectedAlreadyRequested || selectedIsLoading}
                >
                  {selectedIsLoading ? (
                    <>
                      <span className="listing-spinner" />
                      Sending...
                    </>
                  ) : selectedAlreadyRequested ? (
                    "✓ Requested"
                  ) : (
                    "Request Session"
                  )}
                </button>
              ) : (
                <button
                  className="listing-action-btn listing-action-danger listing-modal-action"
                  onClick={() => handleDeleteListing(selectedListing._id)}
                  disabled={selectedIsDeleting}
                >
                  {selectedIsDeleting ? "Deleting..." : "Delete Listing"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Tutor Listing"
        message="Are you sure you want to delete this tutor listing? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        loading={!!deletingListingId}
      />
    </div>
  );
}

export default Listings;
