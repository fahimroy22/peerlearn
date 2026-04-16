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

  const handleListingChange = (e) => {
    setListingForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
      showToast(
        error.response?.data?.message || "Failed to create learner listing",
        "error"
      );
    }
  };

  const handleOfferChange = (listingId, field, value) => {
    setOfferForms((prev) => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        [field]: value,
      },
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
        [listingId]: {
          message: "",
          proposedPrice: "",
          proposedMode: "online",
        },
      }));

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
      showToast(
        "Tutor selected successfully. Request created automatically.",
        "success"
      );
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

      setMyListings((prev) =>
        prev.filter((listing) => listing._id !== selectedListingId)
      );

      setOffersByListing((prev) => {
        const next = { ...prev };
        delete next[selectedListingId];
        return next;
      });

      setBrowseListings((prev) =>
        prev.filter((listing) => listing._id !== selectedListingId)
      );

      showToast("Learner listing deleted successfully", "success");
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to delete listing",
        "error"
      );
    } finally {
      setDeletingListingId("");
      setShowDeleteModal(false);
      setSelectedListingId(null);
    }
  };

  return (
    <div className="page">
      <div className="listing-page-header">
        <div>
          <div className="section-eyebrow">Learner Requests</div>
          <h1 className="page-title">Learn Listings</h1>
          <p className="listing-page-subtitle">
            Learners can post what they want to learn. Tutors can review those needs
            and respond with offers. Compare offers more clearly before choosing.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "browse" ? "active" : ""}`}
          onClick={() => setActiveTab("browse")}
        >
          Browse Listings
        </button>

        {user?.role === "learner" && (
          <>
            <button
              className={`tab-btn ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create Listing
            </button>

            <button
              className={`tab-btn ${activeTab === "my-listings" ? "active" : ""}`}
              onClick={() => setActiveTab("my-listings")}
            >
              My Listings
            </button>
          </>
        )}

        {user?.role === "tutor" && (
          <button
            className={`tab-btn ${activeTab === "my-offers" ? "active" : ""}`}
            onClick={() => setActiveTab("my-offers")}
          >
            My Offers
          </button>
        )}
      </div>

      {activeTab === "create" && user?.role === "learner" && (
        <div className="card">
          <h2 className="card-title">Create Learner Listing</h2>

          <form className="form-grid" onSubmit={handleCreateListing}>
            <input
              type="text"
              name="skillName"
              placeholder="Skill you want to learn"
              value={listingForm.skillName}
              onChange={handleListingChange}
              required
            />

            <textarea
              name="description"
              placeholder="Describe what you want to learn"
              value={listingForm.description}
              onChange={handleListingChange}
              required
            />

            <select
              name="preferredMode"
              value={listingForm.preferredMode}
              onChange={handleListingChange}
            >
              <option value="online">online</option>
              <option value="offline">offline</option>
              <option value="both">both</option>
            </select>

            <input
              type="number"
              name="budget"
              placeholder="Budget"
              value={listingForm.budget}
              onChange={handleListingChange}
            />

            <input
              type="text"
              name="availability"
              placeholder="Availability"
              value={listingForm.availability}
              onChange={handleListingChange}
            />

            <div className="actions">
              <button type="submit">Create Learner Listing</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "browse" && (
        <div>
          <div className="card" style={{ marginBottom: "18px" }}>
            <h2 className="card-title" style={{ fontSize: "20px" }}>
              Search Learner Listings
            </h2>
            <input
              type="text"
              placeholder="Search by skill, learner name, email, mode, budget, availability..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="listing-search-meta">
              Showing {filteredBrowseListings.length} of {browseListings.length} listings
            </div>
          </div>

          <h2 className="section-title">Open Learner Listings</h2>

          {filteredBrowseListings.length === 0 ? (
            <div className="empty-state">No learner listings matched your search.</div>
          ) : (
            <div className="listing-grid">
              {filteredBrowseListings.map((listing) => (
                <div key={listing._id} className="listing-card">
                  <div className="listing-card-top">
                    <div>
                      <h3 className="listing-skill">{listing.skillName}</h3>
                      <p className="listing-desc">{listing.description}</p>
                    </div>

                    <div className="listing-chip-group">
                      <span className="badge badge-yellow">{listing.preferredMode}</span>
                      <span className="badge badge-blue">{listing.status}</span>
                    </div>
                  </div>

                  <div className="listing-highlight-row">
                    <div className="listing-highlight">
                      <span className="listing-highlight-label">Budget</span>
                      <span className="listing-highlight-value">{listing.budget}</span>
                    </div>

                    <div className="listing-highlight">
                      <span className="listing-highlight-label">Availability</span>
                      <span className="listing-highlight-value">
                        {listing.availability || "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div className="listing-divider" />

                  <div className="listing-meta-grid">
                    <div className="listing-meta-item">
                      <span className="listing-meta-label">Learner</span>
                      <span className="listing-meta-value">{listing.learner?.name}</span>
                    </div>

                    <div className="listing-meta-item">
                      <span className="listing-meta-label">Email</span>
                      <span className="listing-meta-value">{listing.learner?.email}</span>
                    </div>

                    <div className="listing-meta-item">
                      <span className="listing-meta-label">User ID</span>
                      <span className="listing-meta-value">
                        {listing.learner?.publicId || "No ID yet"}
                      </span>
                    </div>
                  </div>

                  {user?.role === "tutor" && (
                    <div className="listing-offer-box">
                      <h4 className="listing-offer-title">Send an Offer</h4>

                      <textarea
                        placeholder="Write your offer message"
                        value={offerForms[listing._id]?.message || ""}
                        onChange={(e) =>
                          handleOfferChange(listing._id, "message", e.target.value)
                        }
                      />

                      <div className="form-grid" style={{ marginTop: "12px" }}>
                        <input
                          type="number"
                          placeholder="Proposed Price"
                          value={offerForms[listing._id]?.proposedPrice || ""}
                          onChange={(e) =>
                            handleOfferChange(listing._id, "proposedPrice", e.target.value)
                          }
                        />

                        <select
                          value={offerForms[listing._id]?.proposedMode || "online"}
                          onChange={(e) =>
                            handleOfferChange(listing._id, "proposedMode", e.target.value)
                          }
                        >
                          <option value="online">online</option>
                          <option value="offline">offline</option>
                          <option value="both">both</option>
                        </select>
                      </div>

                      <div className="actions">
                        <button onClick={() => handleSendOffer(listing._id)}>
                          Send Offer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "my-listings" && user?.role === "learner" && (
        <div>
          <h2 className="section-title">My Learner Listings</h2>

          {myListings.length === 0 ? (
            <div className="empty-state">No learner listings yet</div>
          ) : (
            myListings.map((listing) => {
              const isDeleting = deletingListingId === listing._id;

              return (
                <div key={listing._id} className="listing-card" style={{ marginBottom: "18px" }}>
                  <div className="listing-card-top">
                    <div>
                      <h3 className="listing-skill">{listing.skillName}</h3>
                      <p className="listing-desc">{listing.description}</p>
                    </div>

                    <div className="listing-chip-group">
                      <span className="badge badge-yellow">{listing.preferredMode}</span>
                      <span className="badge badge-blue">{listing.status}</span>
                    </div>
                  </div>

                  <div className="listing-highlight-row">
                    <div className="listing-highlight">
                      <span className="listing-highlight-label">Budget</span>
                      <span className="listing-highlight-value">{listing.budget}</span>
                    </div>

                    <div className="listing-highlight">
                      <span className="listing-highlight-label">Availability</span>
                      <span className="listing-highlight-value">
                        {listing.availability || "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div className="actions">
                    {listing.status === "open" && (
                      <button
                        className="secondary"
                        onClick={() => handleCloseListing(listing._id)}
                      >
                        Close Listing
                      </button>
                    )}

                    <button
                      className="danger"
                      onClick={() => handleDeleteListing(listing._id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete Listing"}
                    </button>
                  </div>

                  <div className="listing-divider" />

                  <h3 className="card-title" style={{ fontSize: "20px", marginTop: 0 }}>
                    Tutor Offers
                  </h3>

                  {!offersByListing[listing._id] || offersByListing[listing._id].length === 0 ? (
                    <div className="empty-state">No tutor offers yet</div>
                  ) : (
                    <div className="grid grid-2">
                      {offersByListing[listing._id].map((offer) => (
                        <div key={offer._id} className="offer-compare-card">
                          <div className="offer-compare-top">
                            <div>
                              <div className="offer-compare-name">{offer.tutor?.name}</div>
                              <div className="offer-compare-id">
                                {offer.tutor?.publicId || "No ID yet"}
                              </div>
                            </div>

                            <div className="offer-compare-rating">
                              <span className="badge badge-green">
                                {offer.tutor?.ratingAvg?.toFixed?.(1) ||
                                  offer.tutor?.ratingAvg ||
                                  0}
                              </span>
                              <span className="offer-compare-reviews">
                                {offer.tutor?.ratingCount || 0} reviews
                              </span>
                            </div>
                          </div>

                          <div className="offer-compare-grid">
                            <div className="offer-compare-box">
                              <span className="listing-meta-label">Proposed Price</span>
                              <span className="offer-compare-value">{offer.proposedPrice}</span>
                            </div>

                            <div className="offer-compare-box">
                              <span className="listing-meta-label">Mode</span>
                              <span className="offer-compare-value">{offer.proposedMode}</span>
                            </div>
                          </div>

                          <div className="offer-compare-message">{offer.message}</div>

                          <div className="actions">
                            <Link className="inline-link" to={`/tutor-profile/${offer.tutor?._id}`}>
                              View Tutor Profile
                            </Link>

                            {listing.status === "open" && offer.status === "pending" && (
                              <button onClick={() => handleAcceptOffer(offer._id)}>
                                Accept Tutor
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "my-offers" && user?.role === "tutor" && (
        <div>
          <h2 className="section-title">My Sent Offers</h2>

          {myOffers.length === 0 ? (
            <div className="empty-state">No offers sent yet</div>
          ) : (
            <div className="listing-grid">
              {myOffers.map((offer) => (
                <div key={offer._id} className="listing-card">
                  <div className="listing-card-top">
                    <div>
                      <h3 className="listing-skill">
                        {offer.learnListing?.skillName || "Learner Request"}
                      </h3>
                      <p className="listing-desc">{offer.message}</p>
                    </div>

                    <div className="listing-chip-group">
                      <span className="badge badge-yellow">{offer.proposedMode}</span>
                      <span className="badge badge-blue">{offer.status}</span>
                    </div>
                  </div>

                  <div className="listing-highlight-row">
                    <div className="listing-highlight">
                      <span className="listing-highlight-label">Proposed Price</span>
                      <span className="listing-highlight-value">{offer.proposedPrice}</span>
                    </div>

                    <div className="listing-highlight">
                      <span className="listing-highlight-label">Learner</span>
                      <span className="listing-highlight-value">
                        {offer.learnListing?.learner?.name}
                      </span>
                    </div>
                  </div>

                  <div className="listing-divider" />

                  <div className="listing-meta-grid">
                    <div className="listing-meta-item">
                      <span className="listing-meta-label">Email</span>
                      <span className="listing-meta-value">
                        {offer.learnListing?.learner?.email}
                      </span>
                    </div>

                    <div className="listing-meta-item">
                      <span className="listing-meta-label">Need</span>
                      <span className="listing-meta-value">
                        {offer.learnListing?.description || "No description"}
                      </span>
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