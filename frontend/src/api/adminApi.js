import api from "./axios";

export const getAdminDashboard = async () => {
  const res = await api.get("/admin/dashboard");
  return res.data;
};

export const getAllUsers = async (params = {}) => {
  const res = await api.get("/admin/users", { params });
  return res.data;
};

export const blockUser = async (userId, reason = "") => {
  const res = await api.patch(`/admin/users/${userId}/block`, { reason });
  return res.data;
};

export const unblockUser = async (userId) => {
  const res = await api.patch(`/admin/users/${userId}/unblock`);
  return res.data;
};

export const forceLogoutUser = async (userId) => {
  const res = await api.patch(`/admin/users/${userId}/force-logout`);
  return res.data;
};

export const getAllSupportTickets = async (params = {}) => {
  const res = await api.get("/admin/support/tickets", { params });
  return res.data;
};

export const assignSupportTicket = async (ticketId) => {
  const res = await api.patch(`/admin/support/tickets/${ticketId}/assign`);
  return res.data;
};

export const updateSupportTicketStatus = async (ticketId, status) => {
  const res = await api.patch(`/admin/support/tickets/${ticketId}/status`, {
    status,
  });
  return res.data;
};

export const resolveSupportTicket = async (ticketId) => {
  const res = await api.patch(`/admin/support/tickets/${ticketId}/resolve`);
  return res.data;
};

export const getAuditLogs = async (params = {}) => {
  const res = await api.get("/admin/audit-logs", { params });
  return res.data;
};

export const getAllTeachListingsByAdmin = async () => {
  const res = await api.get("/admin/teach-listings");
  return res.data;
};

export const getAllLearnListingsByAdmin = async () => {
  const res = await api.get("/admin/learn-listings");
  return res.data;
};

export const getAllSkillExchangesByAdmin = async () => {
  const res = await api.get("/admin/skill-exchanges");
  return res.data;
};

export const hideTeachListingByAdmin = async (id, reason = "") => {
  const res = await api.patch(`/admin/teach-listings/${id}/hide`, { reason });
  return res.data;
};

export const restoreTeachListingByAdmin = async (id) => {
  const res = await api.patch(`/admin/teach-listings/${id}/restore`);
  return res.data;
};

export const hideLearnListingByAdmin = async (id, reason = "") => {
  const res = await api.patch(`/admin/learn-listings/${id}/hide`, { reason });
  return res.data;
};

export const restoreLearnListingByAdmin = async (id) => {
  const res = await api.patch(`/admin/learn-listings/${id}/restore`);
  return res.data;
};

export const hideSkillExchangeByAdmin = async (id, reason = "") => {
  const res = await api.patch(`/admin/skill-exchanges/${id}/hide`, { reason });
  return res.data;
};

export const restoreSkillExchangeByAdmin = async (id) => {
  const res = await api.patch(`/admin/skill-exchanges/${id}/restore`);
  return res.data;
};

export const deleteTeachListingByAdmin = async (id) => {
  const res = await api.delete(`/admin/teach-listings/${id}`);
  return res.data;
};

export const deleteLearnListingByAdmin = async (id) => {
  const res = await api.delete(`/admin/learn-listings/${id}`);
  return res.data;
};

export const deleteSkillExchangeByAdmin = async (id) => {
  const res = await api.delete(`/admin/skill-exchanges/${id}`);
  return res.data;
};