import mongoose from 'mongoose';

export interface IColumnDefinition {
  id: string;
  field: string;
  headerName: string;
  width: number;
  resizable: boolean;
  sortable: boolean;
  filter: boolean;
  pinned?: 'left' | 'right' | null;
  cellRenderer?: string;
  headerComponent?: string;
  cellStyle?: Record<string, any>;
  customProperties?: {
    id: string;
    name: string;
    prompt: string;
    aiModel: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
    type: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
    color: string;
    extraction: {
      enabled: boolean;
      status: 'active' | 'inactive' | 'pending';
    };
    styling: {
      backgroundColor: string;
      textColor: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      alignment: 'left' | 'center' | 'right';
    };
  };
}

export interface IProject extends mongoose.Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  collaborators: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'editor' | 'viewer';
    permissions: {
      canEdit: boolean;
      canDelete: boolean;
      canShare: boolean;
      canDownload: boolean;
    };
    addedAt: Date;
  }>;
  gridConfiguration: {
    meta: {
      totalRows: number;
      totalCols: number;
      lastUpdated: Date;
      version: string;
    };
    gridOptions: {
      domLayout: 'normal' | 'autoHeight' | 'print';
      rowSelection: {
        enableClickSelection: boolean;
      };
      suppressCellFocus: boolean;
      enableCellTextSelection: boolean;
      rowHeight: number;
      headerHeight: number;
      defaultColDef: {
        resizable: boolean;
        sortable: boolean;
        filter: boolean;
      };
    };
    columnDefs: Map<string, IColumnDefinition>;
  };
  settings: {
    extractionConfig: {
      ocrEnabled: boolean;
      language: string;
      confidenceThreshold: number;
      autoProcess: boolean;
    };
    permissions: {
      allowDownload: boolean;
      allowShare: boolean;
      requireApproval: boolean;
    };
    notifications: {
      onUpload: boolean;
      onProcessing: boolean;
      onCompletion: boolean;
    };
  };
  stats: {
    documentCount: number;
    totalSize: number;
    processingCount: number;
    completedCount: number;
    lastActivity?: Date;
  };
  status: 'active' | 'archived' | 'deleted';
  tags: string[];
  addCollaborator(userId: mongoose.Types.ObjectId, role?: string, permissions?: any): Promise<IProject>;
  removeCollaborator(userId: mongoose.Types.ObjectId): Promise<IProject>;
  getUserPermissions(userId: mongoose.Types.ObjectId): any;
  updateStats(): Promise<any>;
  addColumn(columnData: any): string;
  removeColumn(columnId: string): boolean;
  createdAt: Date;
  updatedAt: Date;
}

const columnDefinitionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  field: {
    type: String,
    required: true
  },
  headerName: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    default: 150
  },
  resizable: {
    type: Boolean,
    default: true
  },
  sortable: {
    type: Boolean,
    default: true
  },
  filter: {
    type: Boolean,
    default: true
  },
  pinned: {
    type: String,
    enum: ['left', 'right', null],
    default: null
  },
  cellRenderer: String,
  headerComponent: String,
  cellStyle: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  customProperties: {
    id: String,
    name: String,
    prompt: String,
    aiModel: {
      type: String,
      enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2'],
      default: 'gpt-4'
    },
    type: {
      type: String,
      enum: ['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection'],
      default: 'text'
    },
    color: {
      type: String,
      default: '#3b82f6'
    },
    extraction: {
      enabled: { type: Boolean, default: true },
      status: { 
        type: String, 
        enum: ['active', 'inactive', 'pending'], 
        default: 'active' 
      }
    },
    styling: {
      backgroundColor: String,
      textColor: String,
      fontFamily: { type: String, default: 'Inter' },
      fontSize: { type: Number, default: 12 },
      fontWeight: { type: String, default: 'medium' },
      alignment: { 
        type: String, 
        enum: ['left', 'center', 'right'], 
        default: 'left' 
      }
    }
  }
}, { _id: false });

const gridOptionsSchema = new mongoose.Schema({
  domLayout: {
    type: String,
    enum: ['normal', 'autoHeight', 'print'],
    default: 'normal'
  },
  rowSelection: {
    enableClickSelection: { type: Boolean, default: false }
  },
  suppressCellFocus: { type: Boolean, default: true },
  enableCellTextSelection: { type: Boolean, default: true },
  rowHeight: { type: Number, default: 60 },
  headerHeight: { type: Number, default: 45 },
  defaultColDef: {
    resizable: { type: Boolean, default: true },
    sortable: { type: Boolean, default: true },
    filter: { type: Boolean, default: true }
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Project description cannot exceed 500 characters']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer'
    },
    permissions: {
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canShare: { type: Boolean, default: false },
      canDownload: { type: Boolean, default: true }
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Grid configuration specific to this project
  gridConfiguration: {
    meta: {
      totalRows: { type: Number, default: 0 },
      totalCols: { type: Number, default: 2 }, // index and filename columns by default
      lastUpdated: { type: Date, default: Date.now },
      version: { type: String, default: '1.0' }
    },
    gridOptions: {
      type: gridOptionsSchema,
      default: () => ({})
    },
    columnDefs: {
      type: Map,
      of: columnDefinitionSchema,
      default: () => new Map([
        ['index', {
          id: 'index',
          field: 'index',
          headerName: '#',
          width: 60,
          pinned: 'left',
          sortable: false,
          filter: false,
          resizable: false,
          cellStyle: {
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            color: '#6b7280',
            borderRight: '1px solid #e5e7eb'
          }
        }],
        ['filename', {
          id: 'filename',
          field: 'filename',
          headerName: 'Document Bundle',
          width: 320,
          pinned: 'left',
          cellStyle: {
            borderRight: '1px solid #e5e7eb'
          },
          cellRenderer: 'documentBundleRenderer'
        }]
      ])
    }
  },

  settings: {
    extractionConfig: {
      ocrEnabled: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
      confidenceThreshold: { type: Number, default: 0.8, min: 0, max: 1 },
      autoProcess: { type: Boolean, default: true }
    },
    permissions: {
      allowDownload: { type: Boolean, default: true },
      allowShare: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: false }
    },
    notifications: {
      onUpload: { type: Boolean, default: true },
      onProcessing: { type: Boolean, default: false },
      onCompletion: { type: Boolean, default: true }
    }
  },

  stats: {
    documentCount: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 }, // in bytes
    processingCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    lastActivity: Date
  },

  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },

  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ ownerId: 1 });
projectSchema.index({ 'collaborators.userId': 1 });
projectSchema.index({ name: 'text', description: 'text' });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ 'stats.lastActivity': -1 });

// Virtual for checking if user has access
projectSchema.virtual('hasAccess').get(function(this: IProject) {
  return function(userId: mongoose.Types.ObjectId) {
    return this.ownerId.toString() === userId.toString() || 
           this.collaborators.some(collab => collab.userId.toString() === userId.toString());
  };
});

// Method to add collaborator
projectSchema.methods.addCollaborator = function(this: IProject, userId: mongoose.Types.ObjectId, role = 'viewer', permissions = {}) {
  const existingCollab = this.collaborators.find(collab => 
    collab.userId.toString() === userId.toString()
  );
  
  if (existingCollab) {
    existingCollab.role = role;
    existingCollab.permissions = { ...existingCollab.permissions, ...permissions };
  } else {
    this.collaborators.push({
      userId,
      role,
      permissions: {
        canEdit: permissions.canEdit || false,
        canDelete: permissions.canDelete || false,
        canShare: permissions.canShare || false,
        canDownload: permissions.canDownload !== false
      }
    } as any);
  }
  
  return this.save();
};

// Method to remove collaborator
projectSchema.methods.removeCollaborator = function(this: IProject, userId: mongoose.Types.ObjectId) {
  this.collaborators = this.collaborators.filter(collab => 
    collab.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check user permissions
projectSchema.methods.getUserPermissions = function(this: IProject, userId: mongoose.Types.ObjectId) {
  if (this.ownerId.toString() === userId.toString()) {
    return {
      canEdit: true,
      canDelete: true,
      canShare: true,
      canDownload: true,
      role: 'owner'
    };
  }
  
  const collaborator = this.collaborators.find(collab => 
    collab.userId.toString() === userId.toString()
  );
  
  if (collaborator) {
    return {
      ...collaborator.permissions,
      role: collaborator.role
    };
  }
  
  return null; // No access
};

// Method to update project stats
projectSchema.methods.updateStats = async function(this: IProject) {
  const Document = mongoose.models.Document || mongoose.model('Document');
  
  const stats = await Document.aggregate([
    { $match: { projectId: this._id } },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalSize: { $sum: '$fileMetadata.size' },
        processingCount: {
          $sum: { $cond: [{ $eq: ['$processing.status', 'processing'] }, 1, 0] }
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$processing.status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalCount: 0,
    totalSize: 0,
    processingCount: 0,
    completedCount: 0
  };
  
  this.stats.documentCount = result.totalCount;
  this.stats.totalSize = result.totalSize;
  this.stats.processingCount = result.processingCount;
  this.stats.completedCount = result.completedCount;
  this.stats.lastActivity = new Date();
  
  await this.save();
  return this.stats;
};

// Method to add column to grid configuration
projectSchema.methods.addColumn = function(this: IProject, columnData: any) {
  const columnId = `col_${Date.now()}`;
  
  const column = {
    id: columnId,
    field: columnId,
    headerName: columnData.name,
    width: columnData.width || 150,
    resizable: true,
    sortable: true,
    filter: true,
    cellRenderer: 'dataChipRenderer',
    cellStyle: {
      borderRight: '1px solid #e5e7eb'
    },
    headerComponent: 'customHeaderRenderer',
    customProperties: {
      id: columnId,
      name: columnData.name,
      prompt: columnData.prompt,
      aiModel: columnData.aiModel,
      type: columnData.type,
      color: columnData.color || '#3b82f6',
      extraction: {
        enabled: true,
        status: 'active'
      },
      styling: {
        backgroundColor: columnData.color || '#3b82f6',
        textColor: '#ffffff',
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: 'medium',
        alignment: 'left'
      }
    }
  };
  
  this.gridConfiguration.columnDefs.set(columnId, column);
  this.gridConfiguration.meta.totalCols = this.gridConfiguration.columnDefs.size;
  this.gridConfiguration.meta.lastUpdated = new Date();
  
  return columnId;
};

// Method to remove column from grid configuration
projectSchema.methods.removeColumn = function(this: IProject, columnId: string) {
  if (columnId === 'index' || columnId === 'filename') {
    throw new Error('Cannot delete system columns');
  }
  
  this.gridConfiguration.columnDefs.delete(columnId);
  this.gridConfiguration.meta.totalCols = this.gridConfiguration.columnDefs.size;
  this.gridConfiguration.meta.lastUpdated = new Date();
  
  return true;
};

export default mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
