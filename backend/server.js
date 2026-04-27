const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const runReminderJob = require("./utils/sessionReminder");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listingRoutes = require("./routes/listingRoutes");
const requestRoutes = require("./routes/requestRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const messageRoutes = require("./routes/messageRoutes");
const requestMessageRoutes = require("./routes/requestMessageRoutes");
const chatRoutes = require("./routes/chatRoutes");
const learnListingRoutes = require("./routes/learnListingRoutes");
const tutorOfferRoutes = require("./routes/tutorOfferRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const skillExchangeRoutes = require("./routes/skillExchangeRoutes");
const exchangeRequestRoutes = require("./routes/exchangeRequestRoutes");
const exchangeConversationRoutes = require("./routes/exchangeConversationRoutes");
const exchangeMessageRoutes = require("./routes/exchangeMessageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminRoutes = require("./routes/adminRoutes");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  },
});

const PORT = process.env.PORT || 8000;

connectDB();
runReminderJob();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(uploadsDir));

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const userId = socket.handshake.auth?.userId;
  if (userId) {
    socket.join(`user_${userId}`);
  }

  socket.on("join_session", (sessionId) => {
    if (sessionId) socket.join(`session_${sessionId}`);
  });

  socket.on("leave_session", (sessionId) => {
    if (sessionId) socket.leave(`session_${sessionId}`);
  });

  socket.on("join_request", (requestId) => {
    if (requestId) socket.join(`request_${requestId}`);
  });

  socket.on("leave_request", (requestId) => {
    if (requestId) socket.leave(`request_${requestId}`);
  });

  socket.on("join_exchange", (conversationId) => {
    if (conversationId) socket.join(`exchange_${conversationId}`);
  });

  socket.on("leave_exchange", (conversationId) => {
    if (conversationId) socket.leave(`exchange_${conversationId}`);
  });

  socket.on("session_typing", ({ sessionId, userName }) => {
    if (sessionId) {
      socket.to(`session_${sessionId}`).emit("session_typing", { userName });
    }
  });

  socket.on("session_stop_typing", ({ sessionId }) => {
    if (sessionId) {
      socket.to(`session_${sessionId}`).emit("session_stop_typing");
    }
  });

  socket.on("request_typing", ({ requestId, userName }) => {
    if (requestId) {
      socket.to(`request_${requestId}`).emit("request_typing", { userName });
    }
  });

  socket.on("request_stop_typing", ({ requestId }) => {
    if (requestId) {
      socket.to(`request_${requestId}`).emit("request_stop_typing");
    }
  });

  socket.on("exchange_typing", ({ conversationId }) => {
    if (conversationId) {
      socket.to(`exchange_${conversationId}`).emit("exchange_typing");
    }
  });

  socket.on("exchange_stop_typing", ({ conversationId }) => {
    if (conversationId) {
      socket.to(`exchange_${conversationId}`).emit("exchange_stop_typing");
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "PeerLearn backend is running 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/request-messages", requestMessageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/learn-listings", learnListingRoutes);
app.use("/api/tutor-offers", tutorOfferRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/skill-exchanges", skillExchangeRoutes);
app.use("/api/exchange-requests", exchangeRequestRoutes);
app.use("/api/exchange-conversations", exchangeConversationRoutes);
app.use("/api/exchange-messages", exchangeMessageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});