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

  useEffect(() => { fetchData(); }, [user]);

  const filteredBrowseListings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return browseListings;
    return browseListings.filter((listing) => {
      const searchableText = [
        listing.skillName, listing.description, listing.preferredMode,
        String(listing.budget ?? ""), listing.availability, listing.status,
        listing.learner?.name, listing.learner?.email, listing.learner?.publicId,
      ].filter(Boolean).join(" ").toLowerCase();
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
      setListingForm({ skillName: "", description: "", preferredMode: "online", budget: "", availability: "" });
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

  /* ── EXACT ORIGINAL handleSendOffer — triggers notifications ── */
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

  /* ── EXACT ORIGINAL handleAcceptOffer — triggers notifications ── */
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
      setOffersByListing((prev) => { const n = { ...prev }; delete n[selectedListingId]; return n; });
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
    { id: "browse", label: "Browse" },
    ...(user?.role === "learner" ? [
      { id: "create", label: "Post a Need" },
      { id: "my-listings", label: "My Listings" },
    ] : []),
    ...(user?.role === "tutor" ? [
      { id: "my-offers", label: "My Offers" },
    ] : []),
  ];

  return (
    <div className="page ls-page">

      {/* PAGE HEADER */}
      <div className="ls-page-header">
        <div className="ls-page-header-left">
          <span className="ls-eyebrow">Learner Requests</span>
          <h1 className="ls-page-title">Learn Listings</h1>
          <p className="ls-page-sub">
            Learners post what they want to learn. Tutors review and respond with offers.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="ls-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`ls-tab ${activeTab === t.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ BROWSE ══ */}
      {activeTab === "browse" && (
        <div>
          <div className="ls-search-bar">
            <span className="ls-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input type="text" placeholder="Search by skill, learner name, mode, budget…"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="ls-search-clear" onClick={() => setSearchTerm("")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="ls-results-meta">
            <span className="ls-results-count">
              <strong>{filteredBrowseListings.length}</strong> of <strong>{browseListings.length}</strong> listings
            </span>
          </div>

          {filteredBrowseListings.length === 0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <div className="ls-empty-title">No listings found</div>
              <div className="ls-empty-sub">Try a different search term.</div>
            </div>
          ) : (
            <div className="ls-grid">
              {filteredBrowseListings.map((listing, idx) => (
                <div key={listing._id} className="ls-card" style={{ "--card-i": idx }}>
                  <div className="ls-card-body">
                    <div className="ls-skill-row">
                      <h3 className="ls-skill">{listing.skillName}</h3>
                      <div className="ls-tags ls-tags-col">
                        <span className="ls-tag ls-tag-amber">{listing.preferredMode}</span>
                        <span className={`ls-tag ${listing.status === "open" ? "ls-tag-green" : "ls-tag-gray"}`}>
                          {listing.status}
                        </span>
                      </div>
                    </div>
                    <p className="ls-desc">{listing.description}</p>
                  </div>

                  <div className="ls-stats-row">
                    <div className="ls-stat-box">
                      <span className="ls-stat-label">Budget</span>
                      <span className="ls-stat-val ls-price">
                        {listing.budget > 0 ? `৳ ${listing.budget}` : "Open"}
                      </span>
                    </div>
                    <div className="ls-stat-box">
                      <span className="ls-stat-label">Availability</span>
                      <span className="ls-stat-val">{listing.availability || "Flexible"}</span>
                    </div>
                  </div>

                  <div className="ls-learner-chip">
                    <span className="ls-learner-dot" />
                    <div className="ls-learner-info">
                      <span className="ls-learner-name">{listing.learner?.name}</span>
                      <span className="ls-learner-meta">
                        {listing.learner?.email} · {listing.learner?.publicId || "—"}
                      </span>
                    </div>
                  </div>

                  {user?.role === "tutor" && (
                    <div className="ls-card-footer">
                      {expandedOfferId === listing._id ? (
                        <div className="ls-offer-form">
                          <div className="ls-offer-form-head">
                            <span>Your Offer</span>
                            <button className="ls-offer-cancel" onClick={() => setExpandedOfferId(null)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <textarea placeholder="Write your offer message…" rows={3}
                            value={offerForms[listing._id]?.message || ""}
                            onChange={(e) => handleOfferChange(listing._id, "message", e.target.value)} />
                          <div className="ls-offer-row">
                            <div className="ls-field">
                              <label>Price (৳)</label>
                              <input type="number" placeholder="0"
                                value={offerForms[listing._id]?.proposedPrice || ""}
                                onChange={(e) => handleOfferChange(listing._id, "proposedPrice", e.target.value)} />
                            </div>
                            <div className="ls-field">
                              <label>Mode</label>
                              <div className="ls-select-wrap">
                                <select value={offerForms[listing._id]?.proposedMode || "online"}
                                  onChange={(e) => handleOfferChange(listing._id, "proposedMode", e.target.value)}>
                                  <option value="online">Online</option>
                                  <option value="offline">Offline</option>
                                  <option value="both">Both</option>
                                </select>
                                <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                              </div>
                            </div>
                          </div>
                          <button className="ls-btn-primary" onClick={() => handleSendOffer(listing._id)}>
                            Send Offer
                          </button>
                        </div>
                      ) : (
                        <button className="ls-btn-primary" onClick={() => setExpandedOfferId(listing._id)}>
                          Make an Offer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ CREATE ══ */}
      {activeTab === "create" && user?.role === "learner" && (
        <div className="ls-create-card">
          <div className="ls-create-card-head">
            <h2 className="ls-card-title">Post a Learning Need</h2>
            <p className="ls-card-sub">Tell tutors what you want to learn and they'll send you offers.</p>
          </div>
          <form className="ls-create-form" onSubmit={handleCreateListing}>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Skill you want to learn</label>
                <input type="text" name="skillName" placeholder="e.g. React, Calculus, Python…"
                  value={listingForm.skillName} onChange={handleListingChange} required />
              </div>
              <div className="ls-field">
                <label>Budget (৳)</label>
                <input type="number" name="budget" placeholder="0 = Open to offers"
                  value={listingForm.budget} onChange={handleListingChange} />
              </div>
            </div>
            <div className="ls-field ls-field-full">
              <label>Description</label>
              <textarea name="description" placeholder="Describe your learning goals, current level, and what help you need…"
                value={listingForm.description} onChange={handleListingChange} required rows={3} />
            </div>
            <div className="ls-form-row">
              <div className="ls-field">
                <label>Preferred Mode</label>
                <div className="ls-select-wrap">
                  <select name="preferredMode" value={listingForm.preferredMode} onChange={handleListingChange}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="both">Both</option>
                  </select>
                  <svg className="ls-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
              <div className="ls-field">
                <label>Availability</label>
                <input type="text" name="availability" placeholder="e.g. Weekday evenings, weekends…"
                  value={listingForm.availability} onChange={handleListingChange} />
              </div>
            </div>
            <div className="ls-form-actions">
              <button type="submit" className="ls-btn-primary">Post Listing</button>
            </div>
          </form>
        </div>
      )}

      {/* ══ MY LISTINGS ══ */}
      {activeTab === "my-listings" && user?.role === "learner" && (
        <div>
          {myListings.length === 0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div className="ls-empty-title">No listings yet</div>
              <div className="ls-empty-sub">Post your first learning need to get offers from tutors.</div>
              <button className="ls-btn-primary ls-btn-sm" onClick={() => setActiveTab("create")}>Post a Need</button>
            </div>
          ) : (
            <div className="ls-my-listings">
              {myListings.map((listing) => {
                const isDeleting = deletingListingId === listing._id;
                const offers = offersByListing[listing._id] || [];
                return (
                  <div key={listing._id} className="ls-my-listing-card">
                    <div className="ls-my-listing-head">
                      <div className="ls-skill-row">
                        <h3 className="ls-skill">{listing.skillName}</h3>
                        <div className="ls-tags ls-tags-col">
                          <span className="ls-tag ls-tag-amber">{listing.preferredMode}</span>
                          <span className={`ls-tag ${listing.status === "open" ? "ls-tag-green" : "ls-tag-gray"}`}>
                            {listing.status}
                          </span>
                        </div>
                      </div>
                      <p className="ls-desc">{listing.description}</p>
                    </div>

                    <div className="ls-stats-row ls-stats-row-3">
                      <div className="ls-stat-box">
                        <span className="ls-stat-label">Budget</span>
                        <span className="ls-stat-val ls-price">{listing.budget > 0 ? `৳ ${listing.budget}` : "Open"}</span>
                      </div>
                      <div className="ls-stat-box">
                        <span className="ls-stat-label">Availability</span>
                        <span className="ls-stat-val">{listing.availability || "Flexible"}</span>
                      </div>
                      <div className="ls-stat-box">
                        <span className="ls-stat-label">Offers</span>
                        <span className="ls-stat-val">{offers.length}</span>
                      </div>
                    </div>

                    <div className="ls-my-listing-actions">
                      {listing.status === "open" && (
                        <button className="ls-btn-ghost ls-btn-sm" onClick={() => handleCloseListing(listing._id)}>
                          Close Listing
                        </button>
                      )}
                      <button className="ls-btn-danger ls-btn-sm"
                        onClick={() => handleDeleteListing(listing._id)} disabled={isDeleting}>
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>

                    {offers.length > 0 && (
                      <div className="ls-offers-section">
                        <div className="ls-offers-title">
                          {offers.length} Tutor {offers.length === 1 ? "Offer" : "Offers"}
                        </div>
                        <div className="ls-offers-grid">
                          {offers.map((offer) => (
                            <div key={offer._id} className={`ls-offer-card ${offer.status === "accepted" ? "is-accepted" : ""}`}>
                              {offer.status === "accepted" && (
                                <div className="ls-offer-accepted-badge">✓ Accepted</div>
                              )}
                              <div className="ls-offer-top">
                                <div>
                                  <div className="ls-offer-name">{offer.tutor?.name}</div>
                                  <div className="ls-offer-pid">{offer.tutor?.publicId || "—"}</div>
                                </div>
                                <div className="ls-offer-rating">
                                  <span className="ls-tag ls-tag-green">⭐ {offer.tutor?.ratingAvg?.toFixed?.(1) ?? 0}</span>
                                  <span className="ls-offer-reviews">{offer.tutor?.ratingCount ?? 0} reviews</span>
                                </div>
                              </div>
                              <div className="ls-offer-stats">
                                <div className="ls-offer-stat">
                                  <span className="ls-stat-label">Price</span>
                                  <span className="ls-offer-val ls-price">৳ {offer.proposedPrice || 0}</span>
                                </div>
                                <div className="ls-offer-stat">
                                  <span className="ls-stat-label">Mode</span>
                                  <span className="ls-offer-val">{offer.proposedMode}</span>
                                </div>
                              </div>
                              {offer.message && <p className="ls-offer-msg">{offer.message}</p>}
                              <div className="ls-offer-actions">
                                <Link className="ls-btn-ghost ls-btn-sm" to={`/tutor-profile/${offer.tutor?._id}`}>
                                  View Profile
                                </Link>
                                {listing.status === "open" && offer.status === "pending" && (
                                  <button className="ls-btn-primary ls-btn-sm" onClick={() => handleAcceptOffer(offer._id)}>
                                    Accept Tutor
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MY OFFERS ══ */}
      {activeTab === "my-offers" && user?.role === "tutor" && (
        <div>
          {myOffers.length === 0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="ls-empty-title">No offers sent yet</div>
              <div className="ls-empty-sub">Browse learner listings and send your first offer.</div>
              <button className="ls-btn-primary ls-btn-sm" onClick={() => setActiveTab("browse")}>Browse Listings</button>
            </div>
          ) : (
            <div className="ls-grid">
              {myOffers.map((offer, idx) => (
                <div key={offer._id} className={`ls-card ${offer.status === "accepted" ? "ls-card-accepted" : ""}`} style={{ "--card-i": idx }}>
                  <div className="ls-card-body">
                    <div className="ls-skill-row">
                      <h3 className="ls-skill">{offer.learnListing?.skillName || "Learner Request"}</h3>
                      <div className="ls-tags ls-tags-col">
                        <span className="ls-tag ls-tag-amber">{offer.proposedMode}</span>
                        <span className={`ls-tag ${offer.status === "accepted" ? "ls-tag-green" : "ls-tag-blue"}`}>
                          {offer.status}
                        </span>
                      </div>
                    </div>
                    <p className="ls-desc">{offer.message}</p>
                  </div>
                  <div className="ls-stats-row">
                    <div className="ls-stat-box">
                      <span className="ls-stat-label">Your Price</span>
                      <span className="ls-stat-val ls-price">৳ {offer.proposedPrice || 0}</span>
                    </div>
                    <div className="ls-stat-box">
                      <span className="ls-stat-label">Learner</span>
                      <span className="ls-stat-val">{offer.learnListing?.learner?.name || "—"}</span>
                    </div>
                  </div>
                  <div className="ls-learner-chip">
                    <span className="ls-learner-dot" />
                    <div className="ls-learner-info">
                      <span className="ls-learner-name">{offer.learnListing?.learner?.email}</span>
                      <span className="ls-learner-meta">{offer.learnListing?.description || "No description"}</span>
                    </div>
                  </div>
                </div>
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