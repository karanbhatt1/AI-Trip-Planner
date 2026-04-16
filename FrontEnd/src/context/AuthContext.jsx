/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../services/apiClient";

const SESSION_KEY = "sessionToken";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(SESSION_KEY));
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async (sessionToken) => {
    const data = await apiRequest("/api/auth/profile", {
      token: sessionToken,
    });

    return data.user;
  }, []);

  const logout = useCallback(
    async ({ notifyBackend = true } = {}) => {
      const activeToken = localStorage.getItem(SESSION_KEY);

      if (notifyBackend && activeToken) {
        try {
          await apiRequest("/api/auth/logout", {
            method: "POST",
            token: activeToken,
          });
        } catch {
          // Best effort only for stateless JWT logout route.
        }
      }

      clearSession();
    },
    [clearSession]
  );

  const loginWithSessionToken = useCallback(
    async (sessionToken) => {
      localStorage.setItem(SESSION_KEY, sessionToken);
      setToken(sessionToken);

      const profile = await fetchProfile(sessionToken);
      setUser(profile);
      return profile;
    },
    [fetchProfile]
  );

  const refreshProfile = useCallback(async () => {
    const activeToken = localStorage.getItem(SESSION_KEY);
    if (!activeToken) {
      throw new ApiError("No active session", 401, null);
    }

    const profile = await fetchProfile(activeToken);
    setUser(profile);
    return profile;
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (payload) => {
      const activeToken = localStorage.getItem(SESSION_KEY);
      if (!activeToken) {
        throw new ApiError("No active session", 401, null);
      }

      const data = await apiRequest("/api/auth/profile", {
        method: "PUT",
        token: activeToken,
        body: payload,
      });

      setUser(data.user);
      return data.user;
    },
    []
  );

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const profile = await fetchProfile(token);
        setUser(profile);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
        }
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrapAuth();
  }, [token, fetchProfile, clearSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      isInitializing,
      isAuthenticated: Boolean(token && user),
      loginWithSessionToken,
      logout,
      refreshProfile,
      updateProfile,
    }),
    [token, user, isInitializing, loginWithSessionToken, logout, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
