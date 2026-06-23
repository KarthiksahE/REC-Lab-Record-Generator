import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInUser,
  signUpUser,
  signInWithGoogle,
  resetPassword,
  signOutUser,
  subscribeToAuthChanges
} from "../services/firebase";
import axios from "axios";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user details with backend
  const syncUserWithBackend = async (user) => {
    if (!user) return;
    try {
      const token = await user.getIdTokenWrapper();
      // Setup backend API URL
      const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      await axios.post(
        `${backendUrl}/api/auth/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log("User successfully synced with backend PostgreSQL.");
    } catch (error) {
      console.error("Failed to sync user with backend:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
        // Fire sync in background
        await syncUserWithBackend(user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const user = await signInUser(email, password);
      setCurrentUser(user);
      await syncUserWithBackend(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName) => {
    setLoading(true);
    try {
      const user = await signUpUser(email, password, displayName);
      setCurrentUser(user);
      await syncUserWithBackend(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      await syncUserWithBackend(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const recoverPassword = async (email) => {
    return await resetPassword(email);
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    recoverPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
