"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { User } from "@/lib/api/auth";

// Storage usage type
type StorageUsage = {
  used: number;
  limit: number;
  percentage: number;
  formatted: {
    used: string;
    limit: string;
  };
};

interface AuthContextType {
  // Core State
  user: User | null;
  loading: boolean;
  token: string | null;
  error: string | null;
  
  // Core Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // Profile Management
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Utility Methods
  clearError: () => void;
  refreshUser: () => Promise<void>;
  
  // Permission & Capability Checks
  isAdmin: () => boolean;
  hasValidSubscription: () => boolean;
  canCreateProject: () => boolean;
  canUploadDocument: (fileSize?: number) => boolean;
  
  // Storage Management
  getStorageUsage: () => StorageUsage;
  formatStorageSize: (bytes: number) => string;
  
  // Subscription Helpers
  getProjectLimit: () => number;
  getStorageLimit: () => number;
  getRemainingProjects: () => number;
  getRemainingStorage: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API base URL
  const API_URL = "/api";

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const currentToken = token || localStorage.getItem("auth_token");

    return fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        ...options.headers,
      },
    });
  };

  // Storage utility functions
  const formatStorageSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }, []);

  const getStorageUsage = useCallback((): StorageUsage => {
    if (!user) {
      return {
        used: 0,
        limit: 0,
        percentage: 0,
        formatted: { used: "0 B", limit: "0 B" }
      };
    }

    const limits = {
      free: 100 * 1024 * 1024, // 100MB
      basic: 1024 * 1024 * 1024, // 1GB
      premium: 10 * 1024 * 1024 * 1024 // 10GB
    };

    const limit = limits[user.subscription.plan] || limits.free;
    const used = user.stats.storageUsed || 0;
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

    return {
      used,
      limit,
      percentage,
      formatted: {
        used: formatStorageSize(used),
        limit: formatStorageSize(limit)
      }
    };
  }, [user, formatStorageSize]);

  // Permission checking functions
  const isAdmin = useCallback((): boolean => {
    return user?.role === "admin";
  }, [user]);

  const hasValidSubscription = useCallback((): boolean => {
    if (!user?.subscription.expiryDate) return true; // No expiry means valid
    const expiryDate = new Date(user.subscription.expiryDate);
    return expiryDate > new Date();
  }, [user]);

  const getProjectLimit = useCallback((): number => {
    if (!user) return 0;
    const limits = { free: 3, basic: 10, premium: 50 };
    return limits[user.subscription.plan] || 0;
  }, [user]);

  const getStorageLimit = useCallback((): number => {
    if (!user) return 0;
    const limits = {
      free: 100 * 1024 * 1024, // 100MB
      basic: 1024 * 1024 * 1024, // 1GB
      premium: 10 * 1024 * 1024 * 1024 // 10GB
    };
    return limits[user.subscription.plan] || 0;
  }, [user]);

  const canCreateProject = useCallback((): boolean => {
    if (!user) return false;
    return user.stats.projectsCount < getProjectLimit();
  }, [user, getProjectLimit]);

  const canUploadDocument = useCallback((fileSize = 0): boolean => {
    if (!user) return false;
    const storageLimit = getStorageLimit();
    return user.stats.storageUsed + fileSize <= storageLimit;
  }, [user, getStorageLimit]);

  const getRemainingProjects = useCallback((): number => {
    if (!user) return 0;
    return Math.max(0, getProjectLimit() - user.stats.projectsCount);
  }, [user, getProjectLimit]);

  const getRemainingStorage = useCallback((): number => {
    if (!user) return 0;
    return Math.max(0, getStorageLimit() - user.stats.storageUsed);
  }, [user, getStorageLimit]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.success && data.data.token && data.data.user) {
        setToken(data.data.token);
        setUser(data.data.user);

        // Persist to localStorage
        localStorage.setItem("auth_token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      setError(error.message || "Login failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      if (data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);

        // Persist to localStorage
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      setError(error.message || "Registration failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (data: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Profile update failed");
      }

      if (result.success && result.data) {
        setUser(result.data);
        localStorage.setItem("user", JSON.stringify(result.data));
      }
    } catch (error: any) {
      setError(error.message || "Profile update failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Password change failed");
      }
    } catch (error: any) {
      setError(error.message || "Password change failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint (optional - JWT is stateless)
      if (token) {
        await makeAuthenticatedRequest("/auth/logout", {
          method: "POST",
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local state and storage
      setUser(null);
      setToken(null);
      setError(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");

      // Redirect to login
      window.location.href = "/login";
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      setError(null);
      const response = await makeAuthenticatedRequest("/auth/me");
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }
    } catch (error: any) {
      setError(error.message || "Failed to refresh user data");
    }
  };

  // Check authentication status
  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("user");

      if (!storedToken || !storedUser) {
        setLoading(false);
        return;
      }

      // Validate token with backend
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setToken(storedToken);
          setUser(data.user);

          // Update stored user data
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          throw new Error("Invalid user data");
        }
      } else {
        throw new Error("Token validation failed");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // Clear invalid tokens
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        // Core State
        user,
        loading,
        token,
        error,
        
        // Core Actions
        login,
        register,
        logout,
        checkAuth,
        
        // Profile Management
        updateProfile,
        changePassword,
        
        // Utility Methods
        clearError,
        refreshUser,
        
        // Permission & Capability Checks
        isAdmin,
        hasValidSubscription,
        canCreateProject,
        canUploadDocument,
        
        // Storage Management
        getStorageUsage,
        formatStorageSize,
        
        // Subscription Helpers
        getProjectLimit,
        getStorageLimit,
        getRemainingProjects,
        getRemainingStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Additional convenience hooks for common use cases
export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated() {
  const { user, token } = useAuth();
  return !!(user && token);
}

export function useAuthLoading() {
  const { loading } = useAuth();
  return loading;
}

export function useAuthError() {
  const { error } = useAuth();
  return error;
}

export function useIsAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin();
}

export function useStorageUsage() {
  const { getStorageUsage } = useAuth();
  return getStorageUsage();
}

export function useAuthActions() {
  const { 
    login, 
    register, 
    logout, 
    updateProfile, 
    changePassword, 
    clearError, 
    refreshUser 
  } = useAuth();
  
  return {
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    refreshUser,
  };
}
