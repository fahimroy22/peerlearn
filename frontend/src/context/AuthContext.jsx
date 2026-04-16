import { createContext, useEffect, useState } from "react";
import api from "../api/axios";
import { connectSocket, disconnectSocket } from "../socket";

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");

    if (!rawUser || rawUser === "undefined" || rawUser === "null") {
      return null;
    }

    return JSON.parse(rawUser);
  } catch (error) {
    console.error("Failed to parse stored user", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    if (user?._id) {
      connectSocket(user);
    } else {
      disconnectSocket();
    }
  }, [user]);

  const login = (userData) => {
    if (!userData) return;

    localStorage.setItem("user", JSON.stringify(userData));

    if (userData.token) {
      localStorage.setItem("token", userData.token);
    }

    setUser(userData);
    connectSocket(userData);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await api.post("/auth/logout");
      }
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      disconnectSocket();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      window.location.replace("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;