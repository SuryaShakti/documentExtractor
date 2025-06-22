import { apiClient, ApiResponse, PaginationParams, PaginatedResponse } from './client';
import { User } from './auth';

export interface AdminDashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    totalDocuments: number;
    inactiveUsers: number;
  };
  growth: {
    users: Array<{ _id: string; count: number }>;
    projects: Array<{ _id: string; count: number }>;
  };
  subscriptions: {
    free: number;
    basic: number;
    premium: number;
  };
  storage: {
    total: number;
    average: number;
  };
  recentUsers: User[];
  topUsers: User[];
}

export interface AdminUser extends User {
  loginCount: number;
  isEmailVerified: boolean;
}

export interface AdminUserQueryParams extends PaginationParams {
  status?: 'active' | 'inactive' | 'suspended';
  role?: 'user' | 'admin';
  plan?: 'free' | 'basic' | 'premium';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  status?: 'active' | 'inactive' | 'suspended';
  subscription?: {
    plan?: 'free' | 'basic' | 'premium';
    expiryDate?: string | null;
    autoRenew?: boolean;
  };
}

export interface AdminProject {
  _id: string;
  name: string;
  description?: string;
  ownerId: User;
  status: 'active' | 'archived' | 'deleted';
  stats: {
    documentCount: number;
    totalSize: number;
    processingCount: number;
    completedCount: number;
    lastActivity?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminAnalytics {
  timeframe: string;
  registrations: Array<{
    _id: { date: string; plan: string };
    count: number;
  }>;
  projects: Array<{
    _id: string;
    count: number;
  }>;
  uploads: Array<{
    _id: { date: string };
    count: number;
    totalSize: number;
  }>;
  storage: Array<{
    _id: string;
    totalUsers: number;
    totalStorage: number;
    avgStorage: number;
  }>;
}

class AdminService {
  async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    return apiClient.get<AdminDashboardStats>('/admin/dashboard');
  }

  async getUsers(params?: AdminUserQueryParams): Promise<ApiResponse<PaginatedResponse<AdminUser>>> {
    return apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', params);
  }

  async getUser(userId: string): Promise<ApiResponse<{ user: AdminUser; projects: any[]; documentsCount: number; activity: any }>> {
    return apiClient.get(`/admin/users/${userId}`);
  }

  async updateUser(userId: string, data: UpdateUserData): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/admin/users/${userId}`, data);
  }

  async suspendUser(userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/users/${userId}`);
  }

  async reactivateUser(userId: string): Promise<ApiResponse<AdminUser>> {
    return apiClient.post<AdminUser>(`/admin/users/${userId}/reactivate`);
  }

  async getProjects(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<PaginatedResponse<AdminProject>>> {
    return apiClient.get<PaginatedResponse<AdminProject>>('/admin/projects', params);
  }

  async getAnalytics(timeframe = '30d'): Promise<ApiResponse<AdminAnalytics>> {
    return apiClient.get<AdminAnalytics>('/admin/analytics', { timeframe });
  }

  async runSystemCleanup(dryRun = true): Promise<ApiResponse<{ projectsToDelete?: number; documentsToDelete?: number; projectsDeleted?: number; documentsDeleted?: number; estimatedSpaceFreed?: number }>> {
    return apiClient.post('/admin/system/cleanup', { dryRun });
  }

  // Helper methods
  formatUserStatus(status: string): { label: string; color: string } {
    const statusMap: Record<string, { label: string; color: string }> = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800' }
    };
    
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  }

  formatSubscriptionPlan(plan: string): { label: string; color: string } {
    const planMap: Record<string, { label: string; color: string }> = {
      free: { label: 'Free', color: 'bg-gray-100 text-gray-800' },
      basic: { label: 'Basic', color: 'bg-blue-100 text-blue-800' },
      premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800' }
    };
    
    return planMap[plan] || { label: plan, color: 'bg-gray-100 text-gray-800' };
  }

  calculateUserValue(user: AdminUser): number {
    // Simple calculation based on plan and usage
    const planValues = { free: 0, basic: 10, premium: 25 };
    const baseValue = planValues[user.subscription.plan] || 0;
    const usageMultiplier = Math.min(user.stats.projectsCount * 0.5 + user.stats.documentsCount * 0.1, 10);
    
    return baseValue + usageMultiplier;
  }

  getSubscriptionLimits(plan: string) {
    const limits = {
      free: {
        projects: 3,
        storage: 100 * 1024 * 1024, // 100MB
        features: ['Basic extraction', 'Export CSV']
      },
      basic: {
        projects: 10,
        storage: 1024 * 1024 * 1024, // 1GB
        features: ['Advanced extraction', 'Export CSV/Excel', 'Team collaboration']
      },
      premium: {
        projects: 50,
        storage: 10 * 1024 * 1024 * 1024, // 10GB
        features: ['All AI models', 'Priority processing', 'API access', 'Custom integrations']
      }
    };
    
    return limits[plan as keyof typeof limits] || limits.free;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateRetentionRate(users: AdminUser[]): number {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const usersRegisteredLastMonth = users.filter(user => 
      new Date(user.createdAt) >= thirtyDaysAgo
    );
    
    const activeUsersFromLastMonth = usersRegisteredLastMonth.filter(user =>
      user.lastLogin && new Date(user.lastLogin) >= thirtyDaysAgo
    );
    
    return usersRegisteredLastMonth.length > 0 
      ? Math.round((activeUsersFromLastMonth.length / usersRegisteredLastMonth.length) * 100)
      : 0;
  }

  getEngagementScore(user: AdminUser): number {
    // Calculate engagement based on various factors
    let score = 0;
    
    // Recent login
    if (user.lastLogin) {
      const daysSinceLogin = (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin <= 7) score += 30;
      else if (daysSinceLogin <= 30) score += 20;
      else if (daysSinceLogin <= 90) score += 10;
    }
    
    // Project activity
    score += Math.min(user.stats.projectsCount * 10, 30);
    
    // Document uploads
    score += Math.min(user.stats.documentsCount * 2, 20);
    
    // Subscription plan
    const planScores = { free: 0, basic: 10, premium: 20 };
    score += planScores[user.subscription.plan] || 0;
    
    return Math.min(score, 100);
  }

  getUserRisk(user: AdminUser): { level: 'low' | 'medium' | 'high'; reasons: string[] } {
    const reasons: string[] = [];
    let riskScore = 0;
    
    // Inactivity risk
    if (user.lastLogin) {
      const daysSinceLogin = (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 90) {
        riskScore += 3;
        reasons.push('No login in 90+ days');
      } else if (daysSinceLogin > 30) {
        riskScore += 2;
        reasons.push('No login in 30+ days');
      }
    } else {
      riskScore += 2;
      reasons.push('Never logged in');
    }
    
    // Low usage risk
    if (user.stats.projectsCount === 0) {
      riskScore += 2;
      reasons.push('No projects created');
    }
    
    if (user.stats.documentsCount === 0) {
      riskScore += 1;
      reasons.push('No documents uploaded');
    }
    
    // Account status risk
    if (user.status !== 'active') {
      riskScore += 3;
      reasons.push(`Account ${user.status}`);
    }
    
    // Subscription expiry risk
    if (user.subscription.expiryDate && new Date(user.subscription.expiryDate) < new Date()) {
      riskScore += 2;
      reasons.push('Subscription expired');
    }
    
    if (riskScore >= 5) return { level: 'high', reasons };
    if (riskScore >= 3) return { level: 'medium', reasons };
    return { level: 'low', reasons };
  }
}

export const adminService = new AdminService();
export default adminService;
