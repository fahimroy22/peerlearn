import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EditProfile from "./pages/EditProfile";
import Listings from "./pages/Listings";
import LearnListings from "./pages/LearnListings";
import TutorProfile from "./pages/TutorProfile";
import Requests from "./pages/Requests";
import Sessions from "./pages/Sessions";
import Chat from "./pages/Chat";
import RequestChat from "./pages/RequestChat";
import Chats from "./pages/Chats";
import SkillExchange from "./pages/SkillExchange";
import ExchangeChat from "./pages/ExchangeChat";
import Notifications from "./pages/Notifications";
import SessionVerification from "./pages/SessionVerification";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/session-verification/:sessionId" element={<SessionVerification />} />

        <Route
          path="/learn-listings"
          element={
            <ProtectedRoute>
              <LearnListings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tutor-profile/:id"
          element={
            <ProtectedRoute>
              <TutorProfile />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <Requests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <Sessions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:sessionId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/request-chat/:requestId"
          element={
            <ProtectedRoute>
              <RequestChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exchange-chat/:conversationId"
          element={
            <ProtectedRoute>
              <ExchangeChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/skill-exchange"
          element={
            <ProtectedRoute>
              <SkillExchange />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;