import mongoose from 'mongoose';

export interface IExtractedData {
  value: string;
  type: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
  status: 'yes' | 'no' | 'pending' | null;
  confidence: number;
  extractedAt: Date;
  extractedBy: {
    method: 'ai' | 'manual' | 'ocr';
    model?: string;
    version?: string;
    userId?: mongoose.Types.ObjectId;
  };
  metadata?: {
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    pageNumber?: number;
    rawText?: string;
  };
}

export interface IDocument extends mongoose.Document {
  filename: string;
  originalName: string;
  projectId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  cloudinary: {
    publicId: string;
    url: string;
    secureUrl: string;
    format?: string;
    resourceType: 'image' | 'video' | 'raw' | 'auto';
  };
  fileMetadata: {
    size: number;
    mimeType: string;
    extension?: string;
    encoding?: string;
    pages?: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    startedAt?: Date;
    completedAt?: Date;
    progress: number;
    error?: {
      message: string;
      code: string;
      details?: any;
    };
    retryCount: number;
  };
  extractedData: Map<string, IExtractedData>;
  ocrResults?: {
    fullText: string;
    confidence: number;
    language: string;
    blocks: Array<{
      text: string;
      confidence: number;
      coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
  tags: string[];
  category?: string;
  version: number;
  status: 'active' | 'archived' | 'deleted';
  flags: {
    isConfidential: boolean;
    needsReview: boolean;
    isProcessed: boolean;
    hasErrors: boolean;
  };
  auditLog: Array<{
    action: 'created' | 'updated' | 'processed' | 'downloaded' | 'shared' | 'deleted';
    userId: mongoose.Types.ObjectId;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }>;
  analytics: {
    viewCount: number;
    downloadCount: number;
    shareCount: number;
    lastViewed?: Date;
    lastDownloaded?: Date;
  };
  fileSizeFormatted: string;
  processingDuration: number | null;
  setExtractedData(columnId: string, data: Partial<IExtractedData>): Promise<IDocument>;
  getExtractedData(columnId: string): IExtractedData | null;
  updateProcessingStatus(status: string, progress?: number | null, error?: any): Promise<IDocument>;
  addAuditLog(action: string, userId: mongoose.Types.ObjectId, details?: any, req?: any): Promise<IDocument>;
  incrementAnalytics(type: 'view' | 'download' | 'share'): Promise<IDocument>;
  createdAt: Date;
  updatedAt: Date;
}

const extractedDataSchema = new mongoose.Schema({
  value: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['yes', 'no', 'pending', null],
    default: null
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  extractedAt: {
    type: Date,
    default: Date.now
  },
  extractedBy: {
    method: {
      type: String,
      enum: ['ai', 'manual', 'ocr'],
      default: 'ai'
    },
    model: String, // AI model used
    version: String, // Model version
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  metadata: {
    coordinates: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    },
    pageNumber: Number,
    rawText: String
  }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Cloudinary file information
  cloudinary: {
    publicId: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    secureUrl: {
      type: String,
      required: true
    },
    format: String,
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw', 'auto'],
      default: 'auto'
    }
  },
  
  // File metadata
  fileMetadata: {
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    extension: String,
    encoding: String,
    pages: Number, // For multi-page documents
    dimensions: {
      width: Number,
      height: Number
    }
  },
  
  // Processing information
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    error: {
      message: String,
      code: String,
      details: mongoose.Schema.Types.Mixed
    },
    retryCount: {
      type: Number,
      default: 0,
      max: 3
    }
  },
  
  // Extracted data for each column
  extractedData: {
    type: Map,
    of: extractedDataSchema,
    default: () => new Map()
  },
  
  // OCR results (if applicable)
  ocrResults: {
    fullText: String,
    confidence: Number,
    language: String,
    blocks: [{
      text: String,
      confidence: Number,
      coordinates: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }]
  },
  
  // Document tags and categories
  tags: [{
    type: String,
    trim: true
  }],
  
  category: {
    type: String,
    trim: true
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  // Status and flags
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  flags: {
    isConfidential: { type: Boolean, default: false },
    needsReview: { type: Boolean, default: false },
    isProcessed: { type: Boolean, default: false },
    hasErrors: { type: Boolean, default: false }
  },
  
  // Audit trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'processed', 'downloaded', 'shared', 'deleted'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }],
  
  // Analytics
  analytics: {
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    lastViewed: Date,
    lastDownloaded: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
documentSchema.index({ projectId: 1, uploaderId: 1 });
documentSchema.index({ filename: 'text', originalName: 'text' });
documentSchema.index({ 'processing.status': 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ 'cloudinary.publicId': 1 });
documentSchema.index({ 'fileMetadata.mimeType': 1 });

// Virtual for file size in human readable format
documentSchema.virtual('fileSizeFormatted').get(function(this: IDocument) {
  const bytes = this.fileMetadata.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for processing duration
documentSchema.virtual('processingDuration').get(function(this: IDocument) {
  if (this.processing.startedAt && this.processing.completedAt) {
    return this.processing.completedAt.getTime() - this.processing.startedAt.getTime();
  }
  return null;
});

// Method to add extracted data for a column
documentSchema.methods.setExtractedData = function(this: IDocument, columnId: string, data: Partial<IExtractedData>) {
  this.extractedData.set(columnId, {
    value: data.value || '',
    type: data.type || 'text',
    status: data.status || null,
    confidence: data.confidence || 0,
    extractedAt: new Date(),
    extractedBy: data.extractedBy || { method: 'ai' },
    metadata: data.metadata || {}
  } as IExtractedData);
  
  this.markModified('extractedData');
  return this.save();
};

// Method to get extracted data for a column
documentSchema.methods.getExtractedData = function(this: IDocument, columnId: string) {
  return this.extractedData.get(columnId) || null;
};

// Method to update processing status
documentSchema.methods.updateProcessingStatus = function(this: IDocument, status: string, progress = null, error = null) {
  this.processing.status = status as any;
  
  if (progress !== null) {
    this.processing.progress = progress;
  }
  
  if (status === 'processing' && !this.processing.startedAt) {
    this.processing.startedAt = new Date();
  }
  
  if (status === 'completed' || status === 'failed') {
    this.processing.completedAt = new Date();
    this.processing.progress = status === 'completed' ? 100 : this.processing.progress;
    this.flags.isProcessed = status === 'completed';
    this.flags.hasErrors = status === 'failed';
  }
  
  if (error) {
    this.processing.error = error;
    this.flags.hasErrors = true;
  }
  
  return this.save();
};

// Method to add audit log entry
documentSchema.methods.addAuditLog = function(this: IDocument, action: string, userId: mongoose.Types.ObjectId, details = {}, req = null) {
  this.auditLog.push({
    action: action as any,
    userId,
    details,
    ipAddress: req ? req.ip : null,
    userAgent: req ? req.get('User-Agent') : null,
    timestamp: new Date()
  } as any);
  
  return this.save();
};

// Method to increment analytics
documentSchema.methods.incrementAnalytics = function(this: IDocument, type: 'view' | 'download' | 'share') {
  switch (type) {
    case 'view':
      this.analytics.viewCount += 1;
      this.analytics.lastViewed = new Date();
      break;
    case 'download':
      this.analytics.downloadCount += 1;
      this.analytics.lastDownloaded = new Date();
      break;
    case 'share':
      this.analytics.shareCount += 1;
      break;
  }
  
  return this.save();
};

// Static method to get documents by project with pagination
documentSchema.statics.getByProject = function(projectId: mongoose.Types.ObjectId, options: any = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status = 'active',
    search = ''
  } = options;
  
  const query: any = { projectId, status };
  
  if (search) {
    query.$or = [
      { filename: { $regex: search, $options: 'i' } },
      { originalName: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('uploaderId', 'firstName lastName email')
    .exec();
};

// Transform output (remove sensitive data)
documentSchema.methods.toJSON = function(this: IDocument) {
  const document = this.toObject();
  
  // Remove sensitive audit information in certain contexts
  if (document.auditLog) {
    document.auditLog = document.auditLog.map(log => ({
      action: log.action,
      timestamp: log.timestamp,
      details: log.details
    }));
  }
  
  return document;
};

export default mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);
