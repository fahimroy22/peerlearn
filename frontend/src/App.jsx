import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

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

import HelpCenter from "./pages/HelpCenter";
import MySupportTickets from "./pages/MySupportTickets";
import SupportChat from "./pages/SupportChat";
import CreateSupportTicket from "./pages/CreateSupportTicket";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminSupportTickets from "./pages/AdminSupportTickets";
import AdminSupportChat from "./pages/AdminSupportChat";
import AdminListings from "./pages/AdminListings";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminProfile from "./pages/AdminProfile";

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
            <ProtectedRoute adminBlocked>
              <LearnListings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tutor-profile/:id"
          element={
            <ProtectedRoute adminBlocked>
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
            <ProtectedRoute adminBlocked>
              <Requests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sessions"
          element={
            <ProtectedRoute adminBlocked>
              <Sessions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:sessionId"
          element={
            <ProtectedRoute adminBlocked>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/request-chat/:requestId"
          element={
            <ProtectedRoute adminBlocked>
              <RequestChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chats"
          element={
            <ProtectedRoute adminBlocked>
              <Chats />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exchange-chat/:conversationId"
          element={
            <ProtectedRoute adminBlocked>
              <ExchangeChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/skill-exchange"
          element={
            <ProtectedRoute adminBlocked>
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

        <Route
          path="/help"
          element={
            <ProtectedRoute adminBlocked>
              <HelpCenter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support/my"
          element={
            <ProtectedRoute adminBlocked>
              <MySupportTickets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support/new"
          element={
            <ProtectedRoute adminBlocked>
              <CreateSupportTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support/:ticketId"
          element={
            <ProtectedRoute>
              <SupportChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/support"
          element={
            <AdminRoute>
              <AdminSupportTickets />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/support/:ticketId"
          element={
            <AdminRoute>
              <AdminSupportChat />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/listings"
          element={
            <AdminRoute>
              <AdminListings />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <AdminRoute>
              <AdminAuditLogs />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <AdminRoute>
              <AdminProfile />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;