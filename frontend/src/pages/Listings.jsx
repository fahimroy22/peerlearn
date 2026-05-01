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
        (sentRequestsRes.data || [])
          .map((req) => req.listing?._id)
          .filter(Boolean)
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
      setFormData({ skillName: "", description: "", level: "beginner", mode: "online", price: "" });
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

  /* ── THIS IS THE EXACT ORIGINAL handleRequest ── */
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
    if (badge === "Top Tutor") return "ls-badge ls-badge-top";
    if (badge === "Excellent") return "ls-badge ls-badge-excellent";
    if (badge === "Trusted") return "ls-badge ls-badge-trusted";
    return "ls-badge ls-badge-default";
  };

  const getTutorInitials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "T";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  const selectedIsOwnListing = !!user && !!selectedListing && user._id === selectedListing.tutor?._id;
  const selectedAlreadyRequested = !!selectedListing && requestedIds.has(selectedListing._id);
  const selectedIsLoading = !!selectedListing && loadingRequestId === selectedListing._id;
  const selectedIsDeleting = !!selectedListing && deletingListingId === selectedListing._id;
  const selectedAvailabilityLines = selectedListing
    ? getAvailabilityLines(selectedListing.tutor?.availability || [])
    : [];

  return (
    <div className="page ls-page">

      {/* PAGE HEADER */}
      <div className="ls-page-header">
        <div className="ls-page-header-left">
          <span className="ls-eyebrow">Tutor Discovery</span>
          <h1 className="ls-page-title">Tutor Listings</h1>
          <p className="ls-page-sub">
            Compare tutors by skill, level, mode, price, rating, and availability before sending a request.
          </p>
        </div>
        {user?.role === "tutor" && (
          <button
            className={`ls-create-toggle ${showCreateForm ? "is-active" : ""}`}
            onClick={() => setShowCreateForm((p) => !p)}
          >
            {showCreateForm ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>Cancel</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>Create Listing</>
            )}
          </button>
        )}
      </div>

      {pageMessage && (
        <div className="ls-page-message">{pageMessage}</div>
      )}

      {/* CREATE FORM */}
      {user?.role === "tutor" && showCreateForm && (
        <div className="ls-create-card">
          <div className="ls-create-card-head">
            <h2 className="ls-card-title">Create Tutor Listing</h2>
            <p className="ls-card-sub">Fill in your skill details to be discovered by learners.</p>
          </div>
          <form className="ls-create-form" onSubmit={handleCreateListing}>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Skill Name</label>
                <input type="text" name="skillName" placeholder="e.g. Data Structures, Calculus…"
                  value={formData.skillName} onChange={handleChange} required />
              </div>
              <div className="ls-field">
                <label>Price (৳)</label>
                <input type="number" name="price" placeholder="0 = Free"
                  value={formData.price} onChange={handleChange} />
              </div>
            </div>
            <div className="ls-field ls-field-full">
              <label>Description</label>
              <textarea name="description" placeholder="Describe what you can teach…"
                value={formData.description} onChange={handleChange} required rows={3} />
            </div>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Level</label>
                <div className="ls-select-wrap">
                  <select name="level" value={formData.level} onChange={handleChange}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
              <div className="ls-field">
                <label>Mode</label>
                <div className="ls-select-wrap">
                  <select name="mode" value={formData.mode} onChange={handleChange}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="both">Both</option>
                  </select>
                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
            </div>
            <div className="ls-form-actions">
              <button type="submit" className="ls-btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Publish Listing
              </button>
              <button type="button" className="ls-btn-ghost" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH */}
      <div className="ls-search-bar">
        <span className="ls-search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input type="text" placeholder="Search by skill, tutor name, email, or Student ID…"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        {searchTerm && (
          <button className="ls-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="ls-results-meta">
        <span className="ls-results-count">
          <strong>{filteredListings.length}</strong> of <strong>{listings.length}</strong> tutors
        </span>
        {searchTerm && <span className="ls-results-query">for "<em>{searchTerm}</em>"</span>}
      </div>

      {/* GRID */}
      {filteredListings.length === 0 ? (
        <div className="ls-empty">
          <div className="ls-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div className="ls-empty-title">No listings found</div>
          <div className="ls-empty-sub">Try a different search term or clear the filter.</div>
          {searchTerm && <button className="ls-btn-ghost ls-btn-sm" onClick={() => setSearchTerm("")}>Clear search</button>}
        </div>
      ) : (
        <div className="ls-grid">
          {filteredListings.map((listing, idx) => {
            const alreadyRequested = requestedIds.has(listing._id);
            const isOwnListing = user && user._id === listing.tutor?._id;
            const isLoading = loadingRequestId === listing._id;
            const isDeleting = deletingListingId === listing._id;
            const tutorBadge = listing.tutor?.badge || "Beginner";
            const tutorName = listing.tutor?.name || "Tutor";

            return (
              <div key={listing._id} className="ls-card" style={{ "--card-i": idx }}>

                {/* identity bar */}
                <div className="ls-card-identity">
                  <div className="ls-tutor-left">
                    {listing.tutor?.avatar ? (
                      <img src={listing.tutor.avatar} alt={tutorName} className="ls-avatar" />
                    ) : (
                      <div className="ls-avatar ls-avatar-init">{getTutorInitials(tutorName)}</div>
                    )}
                    <div className="ls-tutor-info">
                      <span className="ls-tutor-name">{tutorName}</span>
                      <span className="ls-tutor-pid">{listing.tutor?.publicId || "—"}</span>
                    </div>
                  </div>
                  <span className={getBadgeClass(tutorBadge)}>{tutorBadge}</span>
                </div>

                {/* body */}
                <div className="ls-card-body">
                  <div className="ls-skill-row">
                    <h3 className="ls-skill">{listing.skillName}</h3>
                    <div className="ls-tags">
                      <span className="ls-tag ls-tag-blue">{listing.level}</span>
                      <span className="ls-tag ls-tag-purple">{listing.mode}</span>
                    </div>
                  </div>
                  <p className="ls-desc">
                    {listing.description?.length > 90
                      ? `${listing.description.slice(0, 90)}…`
                      : listing.description}
                  </p>
                </div>

                {/* stats */}
                <div className="ls-stats-row">
                  <div className="ls-stat-box">
                    <span className="ls-stat-label">Rating</span>
                    <span className="ls-stat-val">
                      ⭐ {listing.tutor?.ratingAvg?.toFixed?.(1) ?? "0.0"}
                      <span className="ls-stat-sub"> ({listing.tutor?.ratingCount ?? 0})</span>
                    </span>
                  </div>
                  <div className="ls-stat-box">
                    <span className="ls-stat-label">Price</span>
                    <span className="ls-stat-val ls-price">
                      {listing.price > 0 ? `৳ ${listing.price}` : "Free"}
                    </span>
                  </div>
                </div>

                {/* footer */}
                <div className="ls-card-footer">
                  {!user ? (
                    <div className="ls-notice">Sign in to send a request to this tutor.</div>
                  ) : !isOwnListing ? (
                    <div className="ls-primary-action">
                      <button
                        className={`ls-btn-request ${alreadyRequested ? "is-done" : ""}`}
                        onClick={() => handleRequest(listing._id)}
                        disabled={alreadyRequested || isLoading}
                      >
                        {isLoading ? (
                          <><span className="ls-spinner" /> Sending…</>
                        ) : alreadyRequested ? (
                          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Requested</>
                        ) : (
                          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>Request Session</>
                        )}
                      </button>
                      <div className="ls-action-hint">
                        {alreadyRequested ? "You already sent a request." : "Send a direct request to start."}
                      </div>
                    </div>
                  ) : (
                    <div className="ls-primary-action">
                      <button className="ls-btn-danger ls-btn-full"
                        onClick={() => handleDeleteListing(listing._id)} disabled={isDeleting}>
                        {isDeleting ? <><span className="ls-spinner ls-spinner-red" /> Deleting…</> : "Delete Listing"}
                      </button>
                      <div className="ls-action-hint">This is your listing. You can delete it anytime.</div>
                    </div>
                  )}

                  <div className="ls-secondary-row">
                    <button className="ls-btn-ghost ls-btn-sm" onClick={() => openDetailsModal(listing)}>
                      Details
                    </button>
                    <Link className="ls-btn-ghost ls-btn-sm" to={`/tutor-profile/${listing.tutor?._id}`}>
                      Profile
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedListing && (
        <div className="ls-modal-overlay" onClick={closeDetailsModal}>
          <div className="ls-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ls-modal-head">
              <div className="ls-modal-tutor-row">
                {selectedListing.tutor?.avatar ? (
                  <img src={selectedListing.tutor.avatar} alt="" className="ls-modal-avatar" />
                ) : (
                  <div className="ls-modal-avatar ls-avatar-init">{getTutorInitials(selectedListing.tutor?.name || "")}</div>
                )}
                <div>
                  <div className="ls-modal-tutor-name">{selectedListing.tutor?.name}</div>
                  <div className="ls-modal-tutor-pid">{selectedListing.tutor?.publicId || "—"}</div>
                </div>
              </div>
              <button className="ls-modal-close" onClick={closeDetailsModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <h2 className="ls-modal-title">{selectedListing.skillName}</h2>

            <div className="ls-modal-tags">
              <span className="ls-tag ls-tag-blue">{selectedListing.level}</span>
              <span className="ls-tag ls-tag-purple">{selectedListing.mode}</span>
              <span className={getBadgeClass(selectedListing.tutor?.badge || "Beginner")}>
                {selectedListing.tutor?.badge || "Beginner"}
              </span>
            </div>

            <div className="ls-modal-section">
              <div className="ls-modal-label">Description</div>
              <p className="ls-modal-text">{selectedListing.description}</p>
            </div>

            <div className="ls-modal-grid-4">
              {[
                { label: "Price",      val: selectedListing.price > 0 ? `৳ ${selectedListing.price}` : "Free / Negotiable" },
                { label: "Rating",     val: `⭐ ${selectedListing.tutor?.ratingAvg?.toFixed?.(1) ?? 0}` },
                { label: "Reviews",    val: selectedListing.tutor?.ratingCount ?? 0 },
                { label: "Student ID", val: selectedListing.tutor?.publicId || "No ID yet" },
              ].map(({ label, val }) => (
                <div key={label} className="ls-modal-stat">
                  <span className="ls-modal-stat-label">{label}</span>
                  <span className="ls-modal-stat-val">{val}</span>
                </div>
              ))}
            </div>

            <div className="ls-modal-section">
              <div className="ls-modal-label">Email</div>
              <p className="ls-modal-text">{selectedListing.tutor?.email}</p>
            </div>

            <div className="ls-modal-section">
              <div className="ls-modal-label">Availability</div>
              <div className="ls-avail-list">
                {selectedAvailabilityLines.map((line, i) => (
                  <div key={`${line}-${i}`} className="ls-avail-row">{line}</div>
                ))}
              </div>
            </div>

            <div className="ls-modal-footer">
              <Link className="ls-btn-ghost ls-modal-action"
                to={`/tutor-profile/${selectedListing.tutor?._id}`}
                onClick={closeDetailsModal}>
                View Full Profile
              </Link>
              {!user ? (
                <div className="ls-notice">Sign in to send a request.</div>
              ) : !selectedIsOwnListing ? (
                <button
                  className={`ls-btn-request ls-modal-action ${selectedAlreadyRequested ? "is-done" : ""}`}
                  onClick={() => handleRequest(selectedListing._id)}
                  disabled={selectedAlreadyRequested || selectedIsLoading}
                >
                  {selectedIsLoading ? <><span className="ls-spinner" /> Sending…</>
                    : selectedAlreadyRequested ? "✓ Requested"
                    : "Request Session"}
                </button>
              ) : (
                <button className="ls-btn-danger ls-modal-action"
                  onClick={() => handleDeleteListing(selectedListing._id)} disabled={selectedIsDeleting}>
                  {selectedIsDeleting ? "Deleting…" : "Delete Listing"}
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