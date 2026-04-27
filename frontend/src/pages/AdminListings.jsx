import { useEffect, useMemo, useState } from "react";
import {
  deleteLearnListingByAdmin,
  deleteSkillExchangeByAdmin,
  deleteTeachListingByAdmin,
  getAllLearnListingsByAdmin,
  getAllSkillExchangesByAdmin,
  getAllTeachListingsByAdmin,
  hideLearnListingByAdmin,
  hideSkillExchangeByAdmin,
  hideTeachListingByAdmin,
  restoreLearnListingByAdmin,
  restoreSkillExchangeByAdmin,
  restoreTeachListingByAdmin,
} from "../api/adminApi";
import useToast from "../context/useToast";

function AdminListings() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("teach");
  const [teachListings, setTeachListings] = useState([]);
  const [learnListings, setLearnListings] = useState([]);
  const [skillExchanges, setSkillExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [search, setSearch] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [teachData, learnData, exchangeData] = await Promise.all([
        getAllTeachListingsByAdmin(),
        getAllLearnListingsByAdmin(),
        getAllSkillExchangesByAdmin(),
      ]);

      setTeachListings(teachData || []);
      setLearnListings(learnData || []);
      setSkillExchanges(exchangeData || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to load listings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const currentItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list =
      activeTab === "teach"
        ? teachListings
        : activeTab === "learn"
        ? learnListings
        : skillExchanges;

    return list.filter((item) => {
      const owner =
        activeTab === "teach"
          ? item.tutor
          : activeTab === "learn"
          ? item.learner
          : item.owner;

      return [
        item.skillName,
        item.description,
        item.offerSkill,
        item.wantSkill,
        item.offerDescription,
        item.wantDescription,
        item.status,
        item.adminNote,
        owner?.name,
        owner?.email,
        owner?.publicId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeTab, search, teachListings, learnListings, skillExchanges]);

  const stats = useMemo(() => {
    const hiddenTeach = teachListings.filter((item) => item.status === "hidden").length;
    const hiddenLearn = learnListings.filter((item) => item.status === "hidden").length;
    const hiddenExchange = skillExchanges.filter((item) => item.status === "hidden").length;

    return {
      total: teachListings.length + learnListings.length + skillExchanges.length,
      hidden: hiddenTeach + hiddenLearn + hiddenExchange,
      visible:
        teachListings.length +
        learnListings.length +
        skillExchanges.length -
        (hiddenTeach + hiddenLearn + hiddenExchange),
    };
  }, [teachListings, learnListings, skillExchanges]);

  const handleHide = async (item) => {
    const reason = window.prompt(
      "Why are you hiding this listing?",
      "Please update this listing to follow platform guidelines."
    );

    if (reason === null) return;

    try {
      setWorkingId(item._id);

      if (activeTab === "teach") {
        await hideTeachListingByAdmin(item._id, reason);
      } else if (activeTab === "learn") {
        await hideLearnListingByAdmin(item._id, reason);
      } else {
        await hideSkillExchangeByAdmin(item._id, reason);
      }

      showToast("Listing hidden temporarily", "success");
      fetchAll();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to hide listing", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleRestore = async (item) => {
    try {
      setWorkingId(item._id);

      if (activeTab === "teach") {
        await restoreTeachListingByAdmin(item._id);
      } else if (activeTab === "learn") {
        await restoreLearnListingByAdmin(item._id);
      } else {
        await restoreSkillExchangeByAdmin(item._id);
      }

      showToast("Listing restored", "success");
      fetchAll();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to restore listing", "error");
    } finally {
      setWorkingId("");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      "Delete this item permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setWorkingId(item._id);

      if (activeTab === "teach") {
        await deleteTeachListingByAdmin(item._id);
      } else if (activeTab === "learn") {
        await deleteLearnListingByAdmin(item._id);
      } else {
        await deleteSkillExchangeByAdmin(item._id);
      }

      showToast("Deleted successfully", "success");
      fetchAll();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Failed to delete item", "error");
    } finally {
      setWorkingId("");
    }
  };

  const getOwner = (item) => {
    if (activeTab === "teach") return item.tutor;
    if (activeTab === "learn") return item.learner;
    return item.owner;
  };

  const getTitle = (item) => {
    if (activeTab === "exchange") {
      return `${item.offerSkill || "Skill"} ↔ ${item.wantSkill || "Skill"}`;
    }

    return item.skillName || "Untitled listing";
  };

  const getDescription = (item) => {
    if (activeTab === "exchange") {
      return item.offerDescription || item.wantDescription || "No description";
    }

    return item.description || "No description";
  };

  const getStatusLabel = (item) => {
    if (activeTab === "teach") return item.status || "active";
    return item.status || "open";
  };

  const getTabCount = (tab) => {
    if (tab === "teach") return teachListings.length;
    if (tab === "learn") return learnListings.length;
    return skillExchanges.length;
  };

  return (
    <div className="page">
      <div className="al-page">
        <section className="al-hero">
          <div>
            <div className="al-eyebrow">Admin</div>
            <h1 className="al-title">Listing Management</h1>
            <p className="al-subtitle">
              Review tutor listings, learner requests, and skill exchange posts from one
              organized moderation workspace.
            </p>
          </div>

          <div className="al-hero-panel">
            <span>Total listings</span>
            <strong>{stats.total}</strong>
            <p>{stats.hidden} hidden · {stats.visible} visible</p>
          </div>
        </section>

        <section className="al-stats">
          <div className="al-stat-card">
            <span>Tutor Listings</span>
            <strong>{teachListings.length}</strong>
          </div>

          <div className="al-stat-card">
            <span>Learn Listings</span>
            <strong>{learnListings.length}</strong>
          </div>

          <div className="al-stat-card">
            <span>Skill Exchanges</span>
            <strong>{skillExchanges.length}</strong>
          </div>

          <div className="al-stat-card al-stat-card-accent">
            <span>Hidden Items</span>
            <strong>{stats.hidden}</strong>
          </div>
        </section>

        <section className="al-control-panel">
          <div className="al-tabs">
            <button
              type="button"
              className={activeTab === "teach" ? "active" : ""}
              onClick={() => setActiveTab("teach")}
            >
              Tutor Listings <span>{getTabCount("teach")}</span>
            </button>

            <button
              type="button"
              className={activeTab === "learn" ? "active" : ""}
              onClick={() => setActiveTab("learn")}
            >
              Learn Listings <span>{getTabCount("learn")}</span>
            </button>

            <button
              type="button"
              className={activeTab === "exchange" ? "active" : ""}
              onClick={() => setActiveTab("exchange")}
            >
              Skill Exchanges <span>{getTabCount("exchange")}</span>
            </button>
          </div>

          <div className="al-search-wrap">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search listings, users, skills, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        {loading ? (
          <div className="al-empty">Loading listings...</div>
        ) : currentItems.length === 0 ? (
          <div className="al-empty">No matching items found.</div>
        ) : (
          <section className="al-list">
            {currentItems.map((item) => {
              const owner = getOwner(item);
              const status = getStatusLabel(item);
              const isHidden = status === "hidden";

              return (
                <article
                  key={item._id}
                  className={`al-card ${isHidden ? "is-hidden" : ""}`}
                >
                  <div className="al-card-main">
                    <div className="al-card-top">
                      <div>
                        <h3>{getTitle(item)}</h3>
                        <p>{getDescription(item)}</p>
                      </div>

                      <div className="al-card-badges">
                        <span className="al-chip">{activeTab}</span>
                        <span className={`al-status ${isHidden ? "hidden" : "active"}`}>
                          {status}
                        </span>
                      </div>
                    </div>

                    {item.adminNote && (
                      <div className="al-admin-note">
                        <strong>Admin feedback:</strong> {item.adminNote}
                      </div>
                    )}

                    <div className="al-owner-row">
                      <div className="al-owner-avatar">
                        {owner?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="al-owner-info">
                        <strong>{owner?.name || "Unknown user"}</strong>
                        <span>{owner?.email || "No email"} · {owner?.publicId || "No ID"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="al-actions">
                    {isHidden ? (
                      <button
                        type="button"
                        className="restore"
                        disabled={workingId === item._id}
                        onClick={() => handleRestore(item)}
                      >
                        {workingId === item._id ? "Restoring..." : "Restore"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="hide"
                        disabled={workingId === item._id}
                        onClick={() => handleHide(item)}
                      >
                        {workingId === item._id ? "Hiding..." : "Hide"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="danger"
                      disabled={workingId === item._id}
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminListings;