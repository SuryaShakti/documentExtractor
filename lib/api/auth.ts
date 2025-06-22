import { apiClient, ApiResponse } from "./client";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: "user" | "admin";
  status: "active" | "inactive" | "suspended";
  subscription: {
    plan: "free" | "basic" | "premium";
    startDate?: string;
    expiryDate?: string;
    autoRenew: boolean;
  };
  preferences: {
    theme: "light" | "dark";
    notifications: {
      email: boolean;
      inApp: boolean;
    };
    language: string;
  };
  stats: {
    projectsCount: number;
    documentsCount: number;
    storageUsed: number;
  };
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  preferences?: Partial<User["preferences"]>;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials
    );

    console.log("Login response:", response);
    if (response.success && response.data?.token) {
      apiClient.setAuthToken(response.data.token);
    }

    return response;
  }

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);

    if (response.success && response.data?.token) {
      apiClient.setAuthToken(response.data.token);
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>("/auth/me");
  }

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    return apiClient.put<User>("/auth/profile", data);
  }

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    return apiClient.post<void>("/auth/change-password", data);
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>("/auth/logout");
    apiClient.removeAuthToken();
    return response;
  }

  async validateToken(): Promise<
    ApiResponse<{ valid: boolean; user: Partial<User> }>
  > {
    return apiClient.get("/auth/validate-token");
  }

  // Check if user is authenticated (has valid token)
  isAuthenticated(): boolean {
    return !!apiClient.getAuthToken();
  }

  // Admin check
  isAdmin(user?: User): boolean {
    return user?.role === "admin";
  }

  // Subscription check
  hasValidSubscription(user?: User): boolean {
    if (!user?.subscription.expiryDate) return true; // No expiry means valid

    const expiryDate = new Date(user.subscription.expiryDate);
    return expiryDate > new Date();
  }

  // Check user capabilities
  canCreateProject(user?: User): boolean {
    if (!user) return false;

    const limits = {
      free: 3,
      basic: 10,
      premium: 50,
    };

    return user.stats.projectsCount < limits[user.subscription.plan];
  }

  canUploadDocument(user?: User, fileSize = 0): boolean {
    if (!user) return false;

    const storageLimits = {
      free: 100 * 1024 * 1024, // 100MB
      basic: 1024 * 1024 * 1024, // 1GB
      premium: 10 * 1024 * 1024 * 1024, // 10GB
    };

    return (
      user.stats.storageUsed + fileSize <= storageLimits[user.subscription.plan]
    );
  }

  // Format storage size
  formatStorageSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const authService = new AuthService();
export default authService;
