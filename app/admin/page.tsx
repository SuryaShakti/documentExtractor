"use client";

import { useEffect, useState } from 'react';
import { 
  Users, 
  FolderOpen, 
  FileText, 
  TrendingUp, 
  Activity,
  Calendar,
  Download,
  UserPlus,
  AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { adminService } from '@/lib/api/admin';

interface DashboardStats {
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
  recentUsers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    subscription: { plan: string };
    stats: { projectsCount: number; documentsCount: number };
  }>;
  topUsers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    stats: { projectsCount: number; documentsCount: number; storageUsed: number };
    subscription: { plan: string };
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminService.getDashboardStats();
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.error || 'Failed to load dashboard stats');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboardStats}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const activeUserPercentage = stats.overview.totalUsers > 0 
    ? Math.round((stats.overview.activeUsers / stats.overview.totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of system usage and user activity</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.activeUsers} active ({activeUserPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active projects across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Total uploaded documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.storage.total)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatFileSize(stats.storage.average)} per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>Current plan distribution across users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Free</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.subscriptions.free || 0}</div>
                  <div className="text-xs text-gray-500">
                    {Math.round(((stats.subscriptions.free || 0) / stats.overview.totalUsers) * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Basic</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.subscriptions.basic || 0}</div>
                  <div className="text-xs text-gray-500">
                    {Math.round(((stats.subscriptions.basic || 0) / stats.overview.totalUsers) * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Premium</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.subscriptions.premium || 0}</div>
                  <div className="text-xs text-gray-500">
                    {Math.round(((stats.subscriptions.premium || 0) / stats.overview.totalUsers) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentUsers.slice(0, 5).map((user) => (
                <div key={user._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getPlanBadgeColor(user.subscription.plan)}`}
                    >
                      {user.subscription.plan}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Activity</CardTitle>
          <CardDescription>Users with the most projects and documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topUsers.map((user, index) => (
              <div key={user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{user.stats.projectsCount}</p>
                    <p className="text-gray-500">Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{user.stats.documentsCount}</p>
                    <p className="text-gray-500">Documents</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{formatFileSize(user.stats.storageUsed)}</p>
                    <p className="text-gray-500">Storage</p>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={getPlanBadgeColor(user.subscription.plan)}
                  >
                    {user.subscription.plan}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex flex-col items-center space-y-2">
              <UserPlus className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <TrendingUp className="h-6 w-6" />
              <span>View Analytics</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
              <Download className="h-6 w-6" />
              <span>Export Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
