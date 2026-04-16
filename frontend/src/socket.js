import { io } from "socket.io-client";

const URL = "http://localhost:8000";

const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket"],
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
};

export default socket;