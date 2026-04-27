import api from "./axios";

export const createSupportTicket = async (formData) => {
  const res = await api.post("/support/tickets", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getMySupportTickets = async () => {
  const res = await api.get("/support/tickets/my");
  return res.data;
};

export const getSupportMessages = async (ticketId) => {
  const res = await api.get(`/support/tickets/${ticketId}/messages`);
  return res.data;
};

export const sendSupportMessage = async (formData) => {
  const res = await api.post("/support/messages", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getSupportUnreadCount = async () => {
  const res = await api.get("/support/tickets/unread-count");
  return res.data;
};