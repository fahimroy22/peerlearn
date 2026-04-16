import axios from "axios";

export const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

const getAuthToken = () => {
  const directToken = localStorage.getItem("token");
  if (directToken && directToken !== "null" && directToken !== "undefined") {
    return directToken;
  }

  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser || rawUser === "null" || rawUser === "undefined") {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);
    return parsedUser?.token || null;
  } catch (error) {
    console.error("Failed to parse stored user for token", error);
    return null;
  }
};

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;