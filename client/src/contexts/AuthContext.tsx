import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "manager" | "staff" | "viewer";
  full_name?: string;
  phone?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Cache user data in session storage for quick access
        sessionStorage.setItem("user", JSON.stringify(data.user));
      } else {
        // Clear cache if auth fails
        sessionStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Try to restore from session storage if network error
      const cachedUser = sessionStorage.getItem("user");
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch (e) {
          console.error("Failed to parse cached user:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      // Cache user data in session storage
      sessionStorage.setItem("user", JSON.stringify(data.user));
    } else {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      // Clear session storage on logout
      sessionStorage.removeItem("user");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear user state and cache even if request fails
      setUser(null);
      sessionStorage.removeItem("user");
    }
  };

  const hasRole = (...roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
