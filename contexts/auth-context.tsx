"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type User = {
  id: string;
  email: string;
  name?: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock authentication functions for demo purposes
  const login = async (email: string, password: string) => {
    // In a real app, this would call an API endpoint
    // For now, we'll simulate a successful login
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser({
          id: "user-1",
          email,
          name: "Demo User",
        });
        // Save to local storage
        localStorage.setItem(
          "user",
          JSON.stringify({ id: "user-1", email, name: "Demo User" })
        );
        resolve();
      }, 1000);
    });
  };

  const register = async (email: string, password: string, name?: string) => {
    // In a real app, this would call an API endpoint
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser({
          id: "user-1",
          email,
          name: name || "New User",
        });
        // Save to local storage
        localStorage.setItem(
          "user",
          JSON.stringify({ id: "user-1", email, name: name || "New User" })
        );
        resolve();
      }, 1000);
    });
  };

  const logout = async () => {
    // In a real app, this would call an API endpoint
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser(null);
        localStorage.removeItem("user");
        resolve();
      }, 500);
    });
  };

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
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