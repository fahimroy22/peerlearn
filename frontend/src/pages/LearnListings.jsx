import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import ConfirmModal from "../components/ConfirmModal";

function LearnListings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("browse");
  const [browseListings, setBrowseListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [offersByListing, setOffersByListing] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingListingId, setDeletingListingId] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [expandedOfferId, setExpandedOfferId] = useState(null);

  const [listingForm, setListingForm] = useState({
    skillName: "",
    description: "",
    preferredMode: "online",
    budget: "",
    availability: "",
  });

  const [offerForms, setOfferForms] = useState({});

  const fetchData = async () => {
    try {
      const browseRes = await api.get("/learn-listings");
      setBrowseListings(browseRes.data);

      if (user?.role === "learner") {
        const myListingsRes = await api.get("/learn-listings/my-listings");
        setMyListings(myListingsRes.data);

        const offersMap = {};
        for (const listing of myListingsRes.data) {
          const offersRes = await api.get(`/tutor-offers/listing/${listing._id}`);
          offersMap[listing._id] = offersRes.data;
        }
        setOffersByListing(offersMap);
      }

      if (user?.role === "tutor") {
        const myOffersRes = await api.get("/tutor-offers/my-offers");
        setMyOffers(myOffersRes.data);
      }
    } catch (error) {
      console.error("Failed to load learn listings", error);
      showToast("Failed to load learn listings", "error");
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredBrowseListings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return browseListings;
    return browseListings.filter((listing) => {
      const searchableText = [
        listing.skillName,
        listing.description,
        listing.preferredMode,
        String(listing.budget ?? ""),
        listing.availability,
        listing.status,
        listing.learner?.name,
        listing.learner?.email,
        listing.learner?.publicId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(q);
    });
  }, [browseListings, searchTerm]);

  const handleListingChange = (e) =>
    setListingForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      await api.post("/learn-listings", {
        ...listingForm,
        budget: Number(listingForm.budget) || 0,
      });
      setListingForm({
        skillName: "",
        description: "",
        preferredMode: "online",
        budget: "",
        availability: "",
      });
      setActiveTab("my-listings");
      showToast("Learner listing created successfully", "success");
      fetchData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to create learner listing", "error");
    }
  };

  const handleOfferChange = (listingId, field, value) => {
    setOfferForms((prev) => ({
      ...prev,
      [listingId]: { ...prev[listingId], [field]: value },
    }));
  };

  const handleSendOffer = async (listingId) => {
    const form = offerForms[listingId] || {};
    try {
      await api.post("/tutor-offers", {
        learnListingId: listingId,
        message: form.message || "",
        proposedPrice: Number(form.proposedPrice) || 0,
        proposedMode: form.proposedMode || "online",
      });
      setOfferForms((prev) => ({
        ...prev,
        [listingId]: { message: "", proposedPrice: "", proposedMode: "online" },
      }));
      setExpandedOfferId(null);
      setActiveTab("my-offers");
      showToast("Offer sent successfully", "success");
      fetchData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to send offer", "error");
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      await api.patch(`/tutor-offers/${offerId}/accept`);
      showToast("Tutor selected successfully. Request created automatically.", "success");
      fetchData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to accept tutor", "error");
    }
  };

  const handleCloseListing = async (listingId) => {
    try {
      await api.patch(`/learn-listings/${listingId}/close`);
      showToast("Listing closed", "success");
      fetchData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to close listing", "error");
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
      await api.delete(`/learn-listings/${selectedListingId}`);
      setMyListings((prev) => prev.filter((l) => l._id !== selectedListingId));
      setOffersByListing((prev) => {
        const n = { ...prev };
        delete n[selectedListingId];
        return n;
      });
      setBrowseListings((prev) => prev.filter((l) => l._id !== selectedListingId));
      showToast("Learner listing deleted successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to delete listing", "error");
    } finally {
      setDeletingListingId("");
      setShowDeleteModal(false);
      setSelectedListingId(null);
    }
  };

  const tabs = [
    { id: "browse", label: "Browse", count: browseListings.length },
    ...(user?.role === "learner"
      ? [
          { id: "create", label: "Post a Need" },
          { id: "my-listings", label: "My Listings", count: myListings.length },
        ]
      : []),
    ...(user?.role === "tutor"
      ? [{ id: "my-offers", label: "My Offers", count: myOffers.length }]
      : []),
  ];

  const openListingsCount = browseListings.filter((listing) => listing.status === "open").length;
  const totalOffersCount = Object.values(offersByListing).reduce(
    (sum, offers) => sum + (Array.isArray(offers) ? offers.length : 0),
    0
  );

  const getStatusBadgeClass = (status) => {
    if (status === "open") return "learn-status-badge status-open";
    if (status === "matched") return "learn-status-badge status-matched";
    if (status === "closed") return "learn-status-badge status-closed";
    if (status === "accepted") return "learn-status-badge status-open";
    if (status === "pending") return "learn-status-badge status-pending";
    if (status === "rejected") return "learn-status-badge status-closed";
    return "learn-status-badge status-info";
  };

  const StatusIcon = ({ status }) => {
    if (status === "open" || status === "accepted") {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    if (status === "closed" || status === "rejected") {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    }

    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  };

  const LearnIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L22 8L12 13L2 8L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V15.5C6 17.16 8.69 18.5 12 18.5C15.31 18.5 18 17.16 18 15.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 8V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="page learn-page">
      <div className="learn-hero">
        <div className="learn-hero-content">
          <div className="learn-hero-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L22 8L12 13L2 8L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 10.5V15.5C6 17.16 8.69 18.5 12 18.5C15.31 18.5 18 17.16 18 15.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 8V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="learn-hero-title">Learn Listings</h1>
          <p className="learn-hero-subtitle">
            Learners post what they want to learn. Tutors review needs and respond with personalized offers.
          </p>
        </div>

        <div className="learn-stats">
          <div className="learn-stat-card learn-stat-primary">
            <div className="learn-stat-icon">
              <LearnIcon />
            </div>
            <div className="learn-stat-content">
              <div className="learn-stat-value">{browseListings.length}</div>
              <div className="learn-stat-label">Total Listings</div>
            </div>
          </div>

          <div className="learn-stat-card learn-stat-info">
            <div className="learn-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="learn-stat-content">
              <div className="learn-stat-value">{openListingsCount}</div>
              <div className="learn-stat-label">Open Needs</div>
            </div>
          </div>

          <div className="learn-stat-card learn-stat-success">
            <div className="learn-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 8H17M7 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="learn-stat-content">
              <div className="learn-stat-value">{user?.role === "learner" ? totalOffersCount : myOffers.length}</div>
              <div className="learn-stat-label">{user?.role === "learner" ? "Received Offers" : "My Offers"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="learn-controls">
        <div className="learn-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`learn-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="learn-tab-icon">
                <LearnIcon />
              </span>
              <span className="learn-tab-label">{t.label}</span>
              {typeof t.count === "number" && t.count > 0 && (
                <span className="learn-tab-count">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "browse" && (
          <div className="learn-search-box">
            <span className="learn-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by skill, learner name, mode, budget…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="learn-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="learn-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === "browse" && (
        <div>
          <div className="learn-results-meta">
            <span>
              <strong>{filteredBrowseListings.length}</strong> of{" "}
              <strong>{browseListings.length}</strong> listings
            </span>
            {searchTerm && (
              <span>
                for <em>"{searchTerm}"</em>
              </span>
            )}
          </div>

          {filteredBrowseListings.length === 0 ? (
            <div className="learn-empty">
              <div className="learn-empty-icon">
                <LearnIcon />
              </div>
              <h3 className="learn-empty-title">No listings found</h3>
              <p className="learn-empty-text">Try a different search term.</p>
            </div>
          ) : (
            <div className="learn-grid">
              {filteredBrowseListings.map((listing, idx) => (
                <article key={listing._id} className="learn-card learn-card-animate" style={{ "--card-i": idx }}>
                  <div className="learn-card-glow"></div>

                  <div className="learn-card-header">
                    <div className="learn-header-top">
                      <div className="learn-type-badge">
                        <LearnIcon />
                        Learning Need
                      </div>

                      <div className="learn-badges-cluster">
                        <span className={getStatusBadgeClass(listing.status)}>
                          <StatusIcon status={listing.status} />
                          {listing.status}
                        </span>
                        <span className="learn-mode-badge">{listing.preferredMode}</span>
                      </div>
                    </div>

                    <h2 className="learn-title-new">{listing.skillName}</h2>
                    <p className="learn-subtitle-new">{listing.description}</p>
                  </div>

                  <div className="learn-quick-info">
                    <div className="learn-info-item learn-info-primary">
                      <div className="learn-info-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="learn-info-content">
                        <span className="learn-info-label">Learner</span>
                        <span className="learn-info-value">{listing.learner?.name || "N/A"}</span>
                      </div>
                    </div>

                    <div className="learn-info-item">
                      <div className="learn-info-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2V22M17 5.5H9.5C8.12 5.5 7 6.62 7 8C7 9.38 8.12 10.5 9.5 10.5H14.5C15.88 10.5 17 11.62 17 13C17 14.38 15.88 15.5 14.5 15.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="learn-info-content">
                        <span className="learn-info-label">Budget</span>
                        <span className="learn-info-value">
                          {listing.budget > 0 ? `৳ ${listing.budget}` : "Open"}
                        </span>
                      </div>
                    </div>

                    <div className="learn-info-item">
                      <div className="learn-info-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="learn-info-content">
                        <span className="learn-info-label">Availability</span>
                        <span className="learn-info-value">{listing.availability || "Flexible"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="learn-learner-strip">
                    <span className="learn-learner-dot" />
                    <div className="learn-learner-info">
                      <span className="learn-learner-name">{listing.learner?.email || "No email"}</span>
                      <span className="learn-learner-meta">{listing.learner?.publicId || "No ID yet"}</span>
                    </div>
                  </div>

                  {user?.role === "tutor" && (
                    <div className="learn-actions-row">
                      {expandedOfferId === listing._id ? (
                        <div className="learn-offer-panel">
                          <div className="learn-offer-panel-header">
                            <h3 className="learn-offer-title">Your Offer</h3>
                            <button className="learn-icon-btn" onClick={() => setExpandedOfferId(null)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>

                          <div className="learn-offer-form">
                            <div className="learn-form-field learn-form-field-full">
                              <label>Message</label>
                              <textarea
                                placeholder="Write your offer message…"
                                rows={3}
                                value={offerForms[listing._id]?.message || ""}
                                onChange={(e) =>
                                  handleOfferChange(listing._id, "message", e.target.value)
                                }
                              />
                            </div>

                            <div className="learn-form-field">
                              <label>Price (৳)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={offerForms[listing._id]?.proposedPrice || ""}
                                onChange={(e) =>
                                  handleOfferChange(listing._id, "proposedPrice", e.target.value)
                                }
                              />
                            </div>

                            <div className="learn-form-field">
                              <label>Mode</label>
                              <select
                                value={offerForms[listing._id]?.proposedMode || "online"}
                                onChange={(e) =>
                                  handleOfferChange(listing._id, "proposedMode", e.target.value)
                                }
                              >
                                <option value="online">Online</option>
                                <option value="offline">Offline</option>
                                <option value="both">Both</option>
                              </select>
                            </div>

                            <div className="learn-form-actions">
                              <button
                                type="button"
                                className="learn-panel-submit"
                                onClick={() => handleSendOffer(listing._id)}
                              >
                                Send Offer
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="learn-action-btn learn-action-primary"
                          onClick={() => setExpandedOfferId(listing._id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Make an Offer
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && user?.role === "learner" && (
        <div className="learn-create-panel">
          <div className="learn-panel-header">
            <LearnIcon />
            <div>
              <h2 className="learn-panel-title">Post a Learning Need</h2>
              <p className="learn-panel-subtitle">Tell tutors what you want to learn and they will send you offers.</p>
            </div>
          </div>

          <form className="learn-create-form" onSubmit={handleCreateListing}>
            <div className="learn-create-grid">
              <div className="learn-form-field">
                <label>Skill you want to learn</label>
                <input
                  type="text"
                  name="skillName"
                  placeholder="e.g. React, Calculus, Python…"
                  value={listingForm.skillName}
                  onChange={handleListingChange}
                  required
                />
              </div>

              <div className="learn-form-field">
                <label>Budget (৳)</label>
                <input
                  type="number"
                  name="budget"
                  placeholder="0 = Open to offers"
                  value={listingForm.budget}
                  onChange={handleListingChange}
                />
              </div>

              <div className="learn-form-field learn-form-field-full">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Describe your learning goals, current level, and what help you need…"
                  value={listingForm.description}
                  onChange={handleListingChange}
                  required
                  rows={3}
                />
              </div>

              <div className="learn-form-field">
                <label>Preferred Mode</label>
                <select
                  name="preferredMode"
                  value={listingForm.preferredMode}
                  onChange={handleListingChange}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="learn-form-field">
                <label>Availability</label>
                <input
                  type="text"
                  name="availability"
                  placeholder="e.g. Weekday evenings, weekends…"
                  value={listingForm.availability}
                  onChange={handleListingChange}
                />
              </div>
            </div>

            <div className="learn-form-actions">
              <button type="submit" className="learn-panel-submit">
                Post Listing
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "my-listings" && user?.role === "learner" && (
        <div>
          {myListings.length === 0 ? (
            <div className="learn-empty">
              <div className="learn-empty-icon">
                <LearnIcon />
              </div>
              <h3 className="learn-empty-title">No listings yet</h3>
              <p className="learn-empty-text">Post your first learning need to get offers from tutors.</p>
              <button className="learn-action-btn learn-action-primary" onClick={() => setActiveTab("create")}>
                Post a Need
              </button>
            </div>
          ) : (
            <div className="learn-my-list">
              {myListings.map((listing, idx) => {
                const isDeleting = deletingListingId === listing._id;
                const offers = offersByListing[listing._id] || [];
                return (
                  <article key={listing._id} className="learn-owner-card learn-card-animate" style={{ "--card-i": idx }}>
                    <div className="learn-card-glow"></div>

                    <div className="learn-card-header">
                      <div className="learn-header-top">
                        <div className="learn-type-badge">
                          <LearnIcon />
                          My Need
                        </div>
                        <div className="learn-badges-cluster">
                          <span className={getStatusBadgeClass(listing.status)}>
                            <StatusIcon status={listing.status} />
                            {listing.status}
                          </span>
                          <span className="learn-mode-badge">{listing.preferredMode}</span>
                        </div>
                      </div>

                      <h2 className="learn-title-new">{listing.skillName}</h2>
                      <p className="learn-subtitle-new">{listing.description}</p>
                    </div>

                    <div className="learn-quick-info learn-owner-info">
                      <div className="learn-info-item learn-info-primary">
                        <div className="learn-info-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2V22M17 5.5H9.5C8.12 5.5 7 6.62 7 8C7 9.38 8.12 10.5 9.5 10.5H14.5C15.88 10.5 17 11.62 17 13C17 14.38 15.88 15.5 14.5 15.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="learn-info-content">
                          <span className="learn-info-label">Budget</span>
                          <span className="learn-info-value">{listing.budget > 0 ? `৳ ${listing.budget}` : "Open"}</span>
                        </div>
                      </div>

                      <div className="learn-info-item">
                        <div className="learn-info-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="learn-info-content">
                          <span className="learn-info-label">Availability</span>
                          <span className="learn-info-value">{listing.availability || "Flexible"}</span>
                        </div>
                      </div>

                      <div className="learn-info-item">
                        <div className="learn-info-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="learn-info-content">
                          <span className="learn-info-label">Offers</span>
                          <span className="learn-info-value">{offers.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="learn-actions-row">
                      <div className="learn-actions-left">
                        {listing.status === "open" && (
                          <button
                            className="learn-action-btn learn-action-secondary"
                            onClick={() => handleCloseListing(listing._id)}
                          >
                            Close Listing
                          </button>
                        )}
                        <button
                          className="learn-action-btn learn-action-danger"
                          onClick={() => handleDeleteListing(listing._id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {offers.length > 0 && (
                      <div className="learn-offers-section">
                        <div className="learn-section-title">
                          {offers.length} Tutor {offers.length === 1 ? "Offer" : "Offers"}
                        </div>
                        <div className="learn-offers-grid">
                          {offers.map((offer) => (
                            <div
                              key={offer._id}
                              className={`learn-offer-card ${offer.status === "accepted" ? "is-accepted" : ""}`}
                            >
                              <div className="learn-offer-top">
                                <div>
                                  <div className="learn-offer-name">{offer.tutor?.name}</div>
                                  <div className="learn-offer-id">{offer.tutor?.publicId || "—"}</div>
                                </div>
                                <div className="learn-offer-badges">
                                  <span className={getStatusBadgeClass(offer.status)}>
                                    <StatusIcon status={offer.status} />
                                    {offer.status}
                                  </span>
                                  <span className="learn-mode-badge">⭐ {offer.tutor?.ratingAvg?.toFixed?.(1) ?? 0}</span>
                                </div>
                              </div>

                              <div className="learn-offer-mini-grid">
                                <div className="learn-offer-mini">
                                  <span>Price</span>
                                  <strong>৳ {offer.proposedPrice || 0}</strong>
                                </div>
                                <div className="learn-offer-mini">
                                  <span>Mode</span>
                                  <strong>{offer.proposedMode}</strong>
                                </div>
                              </div>

                              {offer.message && <p className="learn-offer-message">{offer.message}</p>}

                              <div className="learn-offer-actions">
                                <Link className="learn-link-btn" to={`/tutor-profile/${offer.tutor?._id}`}>
                                  View Profile
                                </Link>
                                {listing.status === "open" && offer.status === "pending" && (
                                  <button
                                    className="learn-action-btn learn-action-primary"
                                    onClick={() => handleAcceptOffer(offer._id)}
                                  >
                                    Accept Tutor
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "my-offers" && user?.role === "tutor" && (
        <div>
          {myOffers.length === 0 ? (
            <div className="learn-empty">
              <div className="learn-empty-icon">
                <LearnIcon />
              </div>
              <h3 className="learn-empty-title">No offers sent yet</h3>
              <p className="learn-empty-text">Browse learner listings and send your first offer.</p>
              <button className="learn-action-btn learn-action-primary" onClick={() => setActiveTab("browse")}>
                Browse Listings
              </button>
            </div>
          ) : (
            <div className="learn-grid">
              {myOffers.map((offer, idx) => (
                <article
                  key={offer._id}
                  className={`learn-card learn-card-animate ${offer.status === "accepted" ? "is-accepted" : ""}`}
                  style={{ "--card-i": idx }}
                >
                  <div className="learn-card-glow"></div>

                  <div className="learn-card-header">
                    <div className="learn-header-top">
                      <div className="learn-type-badge">
                        <LearnIcon />
                        My Offer
                      </div>
                      <div className="learn-badges-cluster">
                        <span className={getStatusBadgeClass(offer.status)}>
                          <StatusIcon status={offer.status} />
                          {offer.status}
                        </span>
                        <span className="learn-mode-badge">{offer.proposedMode}</span>
                      </div>
                    </div>

                    <h2 className="learn-title-new">{offer.learnListing?.skillName || "Learner Request"}</h2>
                    <p className="learn-subtitle-new">{offer.message || "No message provided."}</p>
                  </div>

                  <div className="learn-quick-info">
                    <div className="learn-info-item learn-info-primary">
                      <div className="learn-info-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2V22M17 5.5H9.5C8.12 5.5 7 6.62 7 8C7 9.38 8.12 10.5 9.5 10.5H14.5C15.88 10.5 17 11.62 17 13C17 14.38 15.88 15.5 14.5 15.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="learn-info-content">
                        <span className="learn-info-label">Your Price</span>
                        <span className="learn-info-value">৳ {offer.proposedPrice || 0}</span>
                      </div>
                    </div>

                    <div className="learn-info-item">
                      <div className="learn-info-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="learn-info-content">
                        <span className="learn-info-label">Learner</span>
                        <span className="learn-info-value">{offer.learnListing?.learner?.name || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="learn-learner-strip">
                    <span className="learn-learner-dot" />
                    <div className="learn-learner-info">
                      <span className="learn-learner-name">{offer.learnListing?.learner?.email}</span>
                      <span className="learn-learner-meta">{offer.learnListing?.description || "No description"}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Learner Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deletingListingId) {
            setShowDeleteModal(false);
            setSelectedListingId(null);
          }
        }}
        loading={!!deletingListingId}
      />
    </div>
  );
}

export default LearnListings;
