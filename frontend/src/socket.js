import { io } from "socket.io-client";

const URL = "http://localhost:8000";

const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const connectSocket = (user) => {
  if (!user?._id) return;

  socket.auth = {
    userId: user._id,
  };

  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }

  socket.auth = {};
};

export const reinitializeSocket = (user) => {
  disconnectSocket();
  connectSocket(user);
};

export const joinSessionRoom = (sessionId) => {
  if (sessionId) socket.emit("join_session", sessionId);
};

export const leaveSessionRoom = (sessionId) => {
  if (sessionId) socket.emit("leave_session", sessionId);
};

export const joinRequestRoom = (requestId) => {
  if (requestId) socket.emit("join_request", requestId);
};

export const leaveRequestRoom = (requestId) => {
  if (requestId) socket.emit("leave_request", requestId);
};

export const joinExchangeRoom = (conversationId) => {
  if (conversationId) socket.emit("join_exchange", conversationId);
};

export const leaveExchangeRoom = (conversationId) => {
  if (conversationId) socket.emit("leave_exchange", conversationId);
};

export const joinSupportTicketRoom = (ticketId) => {
  if (ticketId) socket.emit("join_support_ticket", ticketId);
};

export const leaveSupportTicketRoom = (ticketId) => {
  if (ticketId) socket.emit("leave_support_ticket", ticketId);
};

export default socket;