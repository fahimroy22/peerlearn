const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  adminOnly,
  superAdminOnly,
} = require("../middleware/authMiddleware");

const {
  getAdminDashboard,

  getAllUsers,
  blockUser,
  unblockUser,
  forceLogoutUser,

  getAllSupportTickets,
  assignSupportTicket,
  reassignSupportTicket,
  updateSupportTicketStatus,
  resolveSupportTicket,
  deleteResolvedSupportTicket,

  getAuditLogs,
  deleteAuditLog,

  getAdminWorkload,
  updateMySupportAvailability,
  promoteToAdmin,
  demoteAdmin,
  warnAdmin,
  updateAdminSettings,

  getAllTeachListingsByAdmin,
  getAllLearnListingsByAdmin,
  getAllSkillExchangesByAdmin,

  hideTeachListingByAdmin,
  restoreTeachListingByAdmin,
  hideLearnListingByAdmin,
  restoreLearnListingByAdmin,
  hideSkillExchangeByAdmin,
  restoreSkillExchangeByAdmin,

  deleteTeachListingByAdmin,
  deleteLearnListingByAdmin,
  deleteSkillExchangeByAdmin,
} = require("../controllers/adminController");

router.get("/dashboard", authMiddleware, adminOnly, getAdminDashboard);

router.get("/users", authMiddleware, adminOnly, getAllUsers);
router.patch("/users/:userId/block", authMiddleware, adminOnly, blockUser);
router.patch("/users/:userId/unblock", authMiddleware, adminOnly, unblockUser);
router.patch(
  "/users/:userId/force-logout",
  authMiddleware,
  adminOnly,
  forceLogoutUser
);

router.get("/support/tickets", authMiddleware, adminOnly, getAllSupportTickets);
router.patch(
  "/support/tickets/:ticketId/assign",
  authMiddleware,
  adminOnly,
  assignSupportTicket
);
router.patch(
  "/support/tickets/:ticketId/reassign",
  authMiddleware,
  superAdminOnly,
  reassignSupportTicket
);
router.patch(
  "/support/tickets/:ticketId/status",
  authMiddleware,
  adminOnly,
  updateSupportTicketStatus
);
router.patch(
  "/support/tickets/:ticketId/resolve",
  authMiddleware,
  adminOnly,
  resolveSupportTicket
);
router.delete(
  "/support/tickets/:ticketId",
  authMiddleware,
  superAdminOnly,
  deleteResolvedSupportTicket
);

router.get("/audit-logs", authMiddleware, adminOnly, getAuditLogs);
router.delete("/audit-logs/:id", authMiddleware, superAdminOnly, deleteAuditLog);

router.get("/workload", authMiddleware, adminOnly, getAdminWorkload);
router.patch(
  "/availability",
  authMiddleware,
  adminOnly,
  updateMySupportAvailability
);

router.patch(
  "/admins/:userId/promote",
  authMiddleware,
  superAdminOnly,
  promoteToAdmin
);
router.patch(
  "/admins/:userId/demote",
  authMiddleware,
  superAdminOnly,
  demoteAdmin
);
router.patch(
  "/admins/:userId/warn",
  authMiddleware,
  superAdminOnly,
  warnAdmin
);
router.patch(
  "/admins/:userId/settings",
  authMiddleware,
  superAdminOnly,
  updateAdminSettings
);

router.get("/teach-listings", authMiddleware, adminOnly, getAllTeachListingsByAdmin);
router.get("/learn-listings", authMiddleware, adminOnly, getAllLearnListingsByAdmin);
router.get(
  "/skill-exchanges",
  authMiddleware,
  adminOnly,
  getAllSkillExchangesByAdmin
);

router.patch(
  "/teach-listings/:id/hide",
  authMiddleware,
  adminOnly,
  hideTeachListingByAdmin
);
router.patch(
  "/teach-listings/:id/restore",
  authMiddleware,
  adminOnly,
  restoreTeachListingByAdmin
);

router.patch(
  "/learn-listings/:id/hide",
  authMiddleware,
  adminOnly,
  hideLearnListingByAdmin
);
router.patch(
  "/learn-listings/:id/restore",
  authMiddleware,
  adminOnly,
  restoreLearnListingByAdmin
);

router.patch(
  "/skill-exchanges/:id/hide",
  authMiddleware,
  adminOnly,
  hideSkillExchangeByAdmin
);
router.patch(
  "/skill-exchanges/:id/restore",
  authMiddleware,
  adminOnly,
  restoreSkillExchangeByAdmin
);

router.delete(
  "/teach-listings/:id",
  authMiddleware,
  adminOnly,
  deleteTeachListingByAdmin
);
router.delete(
  "/learn-listings/:id",
  authMiddleware,
  adminOnly,
  deleteLearnListingByAdmin
);
router.delete(
  "/skill-exchanges/:id",
  authMiddleware,
  adminOnly,
  deleteSkillExchangeByAdmin
);

module.exports = router;