"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Plus, 
  Download, 
  Filter, 
  Search, 
  MoreHorizontal,
  Upload,
  Settings,
  Users,
  BarChart3
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { 
  useActiveProject, 
  useProjectActions,
  useDocuments,
  useDocumentActions,
  useDocumentLoading
} from '@/lib/stores';
import { DocumentGrid } from '@/components/dashboard/DocumentGrid';
import { UploadDocumentDialog } from '@/components/dashboard/UploadDocumentDialog';
import { AddColumnDialog } from '@/components/dashboard/AddColumnDialog';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const activeProject = useActiveProject();
  const { getProject } = useProjectActions();
  const documents = useDocuments();
  const { getDocuments } = useDocumentActions();
  const isLoading = useDocumentLoading();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);

  // Load project and documents
  useEffect(() => {
    if (projectId) {
      getProject(projectId);
      getDocuments(projectId);
    }
  }, [projectId, getProject, getDocuments]);

  const getProjectStats = () => {
    if (!activeProject) return { total: 0, completed: 0, processing: 0, failed: 0 };
    
    return {
      total: activeProject.stats.documentCount,
      completed: activeProject.stats.completedCount,
      processing: activeProject.stats.processingCount,
      failed: documents.filter(doc => doc.status === 'failed').length
    };
  };

  const stats = getProjectStats();
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {activeProject.name}
              </h1>
              <Badge variant="outline" className="capitalize">
                {activeProject.status}
              </Badge>
            </div>
            {activeProject.description && (
              <p className="mt-1 text-sm text-gray-500 truncate">
                {activeProject.description}
              </p>
            )}
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
              <span>{stats.total} documents</span>
              <span>{completionRate}% completed</span>
              <span>
                {Object.keys(activeProject.gridConfiguration.columnDefs).length - 2} extraction columns
              </span>
              {activeProject.stats.lastActivity && (
                <span>
                  Updated {new Date(activeProject.stats.lastActivity).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddColumnDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Collaborators
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Project Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <div className="h-4 w-4 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <div className="text-xs font-bold text-purple-600">{completionRate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <div className="text-sm text-gray-500">
            {documents.length} documents
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="flex-1 bg-white">
        <DocumentGrid 
          projectId={projectId}
          searchTerm={searchTerm}
        />
      </div>

      {/* Dialogs */}
      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        projectId={projectId}
      />

      <AddColumnDialog
        open={showAddColumnDialog}
        onOpenChange={setShowAddColumnDialog}
        projectId={projectId}
      />
    </div>
  );
}
