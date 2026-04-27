const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/authMiddleware");

const {
  getAdminDashboard,

  getAllUsers,
  blockUser,
  unblockUser,
  forceLogoutUser,

  getAllSupportTickets,
  assignSupportTicket,
  updateSupportTicketStatus,
  resolveSupportTicket,

  getAuditLogs,

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
router.patch("/users/:userId/force-logout", authMiddleware, adminOnly, forceLogoutUser);

router.get("/support/tickets", authMiddleware, adminOnly, getAllSupportTickets);
router.patch("/support/tickets/:ticketId/assign", authMiddleware, adminOnly, assignSupportTicket);
router.patch("/support/tickets/:ticketId/status", authMiddleware, adminOnly, updateSupportTicketStatus);
router.patch("/support/tickets/:ticketId/resolve", authMiddleware, adminOnly, resolveSupportTicket);

router.get("/audit-logs", authMiddleware, adminOnly, getAuditLogs);

router.get("/teach-listings", authMiddleware, adminOnly, getAllTeachListingsByAdmin);
router.get("/learn-listings", authMiddleware, adminOnly, getAllLearnListingsByAdmin);
router.get("/skill-exchanges", authMiddleware, adminOnly, getAllSkillExchangesByAdmin);

router.patch("/teach-listings/:id/hide", authMiddleware, adminOnly, hideTeachListingByAdmin);
router.patch("/teach-listings/:id/restore", authMiddleware, adminOnly, restoreTeachListingByAdmin);

router.patch("/learn-listings/:id/hide", authMiddleware, adminOnly, hideLearnListingByAdmin);
router.patch("/learn-listings/:id/restore", authMiddleware, adminOnly, restoreLearnListingByAdmin);

router.patch("/skill-exchanges/:id/hide", authMiddleware, adminOnly, hideSkillExchangeByAdmin);
router.patch("/skill-exchanges/:id/restore", authMiddleware, adminOnly, restoreSkillExchangeByAdmin);

router.delete("/teach-listings/:id", authMiddleware, adminOnly, deleteTeachListingByAdmin);
router.delete("/learn-listings/:id", authMiddleware, adminOnly, deleteLearnListingByAdmin);
router.delete("/skill-exchanges/:id", authMiddleware, adminOnly, deleteSkillExchangeByAdmin);

module.exports = router;