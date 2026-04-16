import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import ConfirmModal from "../components/ConfirmModal";

function Listings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [listings, setListings] = useState([]);
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [loadingRequestId, setLoadingRequestId] = useState("");
  const [deletingListingId, setDeletingListingId] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);

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
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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

      setListings((prev) =>
        prev.filter((listing) => listing._id !== selectedListingId)
      );

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

  const handleRequest = async (listingId) => {
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

  const formatAvailabilityPreview = (availability = []) => {
    const activeDays = availability.filter((day) => (day.slots || []).length > 0);

    if (activeDays.length === 0) return "No availability added";

    return activeDays
      .slice(0, 2)
      .map(
        (day) =>
          `${day.day}: ${(day.slots || [])
            .slice(0, 2)
            .map(
              (slot) =>
                `${formatTime12Hour(slot.start)}-${formatTime12Hour(slot.end)}`
            )
            .join(", ")}`
      )
      .join(" • ");
  };

  const getBadgeClass = (badge) => {
    if (badge === "Top Tutor") return "listing-trust-pill listing-badge-top";
    if (badge === "Excellent") return "listing-trust-pill listing-badge-excellent";
    if (badge === "Trusted") return "listing-trust-pill listing-badge-trusted";
    return "listing-trust-pill listing-badge-beginner";
  };

  return (
    <div className="page">
      <div className="listing-page-header">
        <div>
          <div className="section-eyebrow">Tutor Discovery</div>
          <h1 className="page-title">Tutor Listings</h1>
          <p className="listing-page-subtitle">
            Compare tutors by skill, teaching level, mode, price, rating, reputation,
            and availability before sending a request.
          </p>
        </div>
      </div>

      {pageMessage && (
        <div className="card" style={{ marginBottom: "16px", color: "#1d4ed8" }}>
          {pageMessage}
        </div>
      )}

      {user?.role === "tutor" && (
        <div className="card">
          <h2 className="card-title">Create Tutor Listing</h2>

          <form className="form-grid" onSubmit={handleCreateListing}>
            <input
              type="text"
              name="skillName"
              placeholder="Skill name"
              value={formData.skillName}
              onChange={handleChange}
              required
            />

            <textarea
              name="description"
              placeholder="Describe what you can teach"
              value={formData.description}
              onChange={handleChange}
              required
            />

            <select name="level" value={formData.level} onChange={handleChange}>
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>

            <select name="mode" value={formData.mode} onChange={handleChange}>
              <option value="online">online</option>
              <option value="offline">offline</option>
              <option value="both">both</option>
            </select>

            <input
              type="number"
              name="price"
              placeholder="Price"
              value={formData.price}
              onChange={handleChange}
            />

            <div className="actions">
              <button type="submit">Create Listing</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: "18px" }}>
        <h2 className="card-title" style={{ fontSize: "20px" }}>
          Search Tutors
        </h2>
        <input
          type="text"
          placeholder="Search by skill, tutor name, email, or Student ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="listing-search-meta">
          Showing {filteredListings.length} of {listings.length} listings
        </div>
      </div>

      <div>
        <h2 className="section-title">Available Tutors</h2>

        {filteredListings.length === 0 ? (
          <div className="empty-state">No tutor listings matched your search.</div>
        ) : (
          <div className="listing-grid">
            {filteredListings.map((listing) => {
              const alreadyRequested = requestedIds.has(listing._id);
              const isOwnListing = user && user._id === listing.tutor?._id;
              const isLoading = loadingRequestId === listing._id;
              const isDeleting = deletingListingId === listing._id;

              const tutorBadge = listing.tutor?.badge || "Beginner";
              const tutorAvailability = listing.tutor?.availability || [];

              return (
                <div key={listing._id} className="listing-card">
                  <div className="listing-card-top">
                    <div>
                      <h3 className="listing-skill">{listing.skillName}</h3>
                      <p className="listing-desc">{listing.description}</p>
                    </div>

                    <div className="listing-chip-group">
                      <span className="badge badge-blue">{listing.level}</span>
                      <span className="badge badge-yellow">{listing.mode}</span>
                    </div>
                  </div>

                  <div className="listing-tutor-row">
                    <span className="listing-tutor-name">{listing.tutor?.name}</span>
                    <span className={getBadgeClass(tutorBadge)}>{tutorBadge}</span>
                  </div>

                  <div className="listing-rating-row">
                    <div className="listing-rating-box">
                      <span className="listing-meta-label">Average Rating</span>
                      <span className="listing-rating-value">
                        ⭐{" "}
                        {listing.tutor?.ratingAvg?.toFixed?.(1) ||
                          listing.tutor?.ratingAvg ||
                          0}
                      </span>
                    </div>

                    <div className="listing-rating-box">
                      <span className="listing-meta-label">Total Reviews</span>
                      <span className="listing-rating-value">
                        {listing.tutor?.ratingCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="listing-trust-row">
                    <span className="listing-trust-pill">
                      {listing.price > 0 ? `৳ ${listing.price}` : "Free / Negotiable"}
                    </span>
                    <span className="listing-trust-pill">
                      Student ID: {listing.tutor?.publicId || "No ID yet"}
                    </span>
                  </div>

                  <div className="listing-divider" />

                  <div className="listing-meta-grid">
                    <div className="listing-meta-item">
                      <span className="listing-meta-label">Email</span>
                      <span className="listing-meta-value">{listing.tutor?.email}</span>
                    </div>
                  </div>

                  <div className="listing-availability-card">
                    <span className="listing-meta-label">Availability</span>
                    <p className="listing-availability-copy">
                      {formatAvailabilityPreview(tutorAvailability)}
                    </p>
                  </div>

                  <div className="actions">
                    <Link
                      className="inline-link"
                      to={`/tutor-profile/${listing.tutor?._id}`}
                    >
                      View Tutor Profile
                    </Link>
                  </div>

                  {!user ? (
                    <div className="listing-guidance-box">
                      Sign in to send a request and start chatting with this tutor.
                    </div>
                  ) : !isOwnListing ? (
                    <div className="listing-action-row">
                      <button
                        onClick={() => handleRequest(listing._id)}
                        disabled={alreadyRequested || isLoading}
                        className={alreadyRequested ? "secondary" : ""}
                      >
                        {isLoading
                          ? "Sending..."
                          : alreadyRequested
                          ? "Requested"
                          : "Request Session"}
                      </button>

                      <div className="listing-action-hint">
                        {alreadyRequested
                          ? "You already sent a request for this listing."
                          : "Send a direct request to start the process."}
                      </div>
                    </div>
                  ) : (
                    <div className="listing-action-row">
                      <button
                        className="danger"
                        onClick={() => handleDeleteListing(listing._id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Listing"}
                      </button>

                      <div className="listing-action-hint">
                        This is your own tutor listing. You can delete it anytime.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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