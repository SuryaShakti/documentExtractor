"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Plus,
  FileText,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import {
  useProjects,
  useActiveProject,
  useProjectActions,
} from "@/lib/stores";
import { useAuth, useStorageUsage } from "@/contexts/auth-context";

function DashboardContent() {
  const router = useRouter();
  const { user, formatStorageSize } = useAuth();
  const storageUsage = useStorageUsage();
  const projects = useProjects();
  const activeProject = useActiveProject();
  const { getProjects, setActiveProject } = useProjectActions();

  useEffect(() => {
    // Load projects when dashboard loads
    getProjects();
  }, [getProjects]);

  // If user has projects and no active project is selected, redirect to first project
  useEffect(() => {
    if (projects.length > 0 && !activeProject) {
      const firstProject = projects[0];
      setActiveProject(firstProject);
      router.push(`/dashboard/projects/${firstProject._id}`);
    }
  }, [projects, activeProject, router, setActiveProject]);

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome to Document Extractor
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first project to start extracting data from documents
            using AI.
          </p>
          <Button
            onClick={() => router.push("/dashboard/projects/new")}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <div className="font-medium">Upload Documents</div>
              <div className="text-gray-500 text-center">
                PDF, Word, images, and more
              </div>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
              <div className="font-medium">AI Extraction</div>
              <div className="text-gray-500 text-center">
                Extract structured data automatically
              </div>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-purple-500 mb-2" />
              <div className="font-medium">Collaborate</div>
              <div className="text-gray-500 text-center">
                Share projects with your team
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Overview of your document extraction projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.stats.projectsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.subscription.plan === "premium"
                ? "50"
                : user?.subscription.plan === "basic"
                ? "10"
                : "3"}{" "}
              maximum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.stats.documentsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storageUsage.formatted.used}
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">
                {storageUsage.percentage}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <Badge variant="secondary">{user?.subscription.plan}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {user?.subscription.plan}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.subscription.expiryDate
                ? `Expires ${new Date(
                    user.subscription.expiryDate
                  ).toLocaleDateString()}`
                : "Active"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Your most recently updated projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.slice(0, 5).map((project) => (
              <div
                key={project._id}
                className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setActiveProject(project);
                  router.push(`/dashboard/projects/${project._id}`);
                }}
              >
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {project.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.stats.documentCount} documents •{" "}
                    {project.collaborators.length + 1} members
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {Math.round(
                      (project.stats.completedCount /
                        Math.max(project.stats.documentCount, 1)) *
                        100
                    )}
                    % complete
                  </Badge>
                  {project.stats.lastActivity && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(
                        project.stats.lastActivity
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
