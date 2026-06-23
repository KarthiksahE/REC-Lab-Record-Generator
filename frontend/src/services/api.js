import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000"
});

// Axios Request Interceptor to inject JWT Authorization Token
api.interceptors.request.use(
  async (config) => {
    let token = null;
    
    try {
      // 1. Try to fetch ID token from active Firebase auth user
      if (auth && auth.currentUser) {
        token = await auth.currentUser.getIdToken(true); // Force refresh
      }
    } catch (e) {
      console.warn("Firebase token extraction failed. Checking Mock Auth cache...");
    }
    
    // 2. Fallback to mock session if token was not fetched
    if (!token) {
      const mockSession = localStorage.getItem("mock_user_session");
      if (mockSession) {
        try {
          const parsedUser = JSON.parse(mockSession);
          token = `mock_token_${parsedUser.uid}`;
        } catch (e) {}
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
