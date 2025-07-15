import mongoose from 'mongoose';

export interface IDocumentCollection extends mongoose.Document {
  name: string;
  projectId: mongoose.Types.ObjectId;
  documents: mongoose.Types.ObjectId[];
  extractedData: Map<string, {
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
    sourceDocuments: mongoose.Types.ObjectId[];
    aggregationType: 'concatenated' | 'summary' | 'average' | 'list';
  }>;
  settings: {
    autoAggregate: boolean;
    aggregationOrder: mongoose.Types.ObjectId[];
    hiddenDocuments: mongoose.Types.ObjectId[];
  };
  stats: {
    documentCount: number;
    totalSize: number;
    lastModified: Date;
  };
  status: 'active' | 'archived' | 'deleted';
  order: number;
  addDocument(documentId: mongoose.Types.ObjectId): Promise<IDocumentCollection>;
  removeDocument(documentId: mongoose.Types.ObjectId): Promise<IDocumentCollection>;
  hideDocument(documentId: mongoose.Types.ObjectId): Promise<IDocumentCollection>;
  showDocument(documentId: mongoose.Types.ObjectId): Promise<IDocumentCollection>;
  reorderDocuments(newOrder: mongoose.Types.ObjectId[]): Promise<IDocumentCollection>;
  aggregateExtractedData(columnId: string): Promise<any>;
  updateStats(): Promise<IDocumentCollection>;
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
    model: String,
    version: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  sourceDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  aggregationType: {
    type: String,
    enum: ['concatenated', 'summary', 'average', 'list'],
    default: 'concatenated'
  }
}, { _id: false });

const documentCollectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Collection name is required'],
    trim: true,
    default: function(this: IDocumentCollection) {
      return `Collection ${Date.now()}`;
    }
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  extractedData: {
    type: Map,
    of: extractedDataSchema,
    default: () => new Map()
  },
  settings: {
    autoAggregate: {
      type: Boolean,
      default: true
    },
    aggregationOrder: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }],
    hiddenDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }]
  },
  stats: {
    documentCount: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
documentCollectionSchema.index({ projectId: 1, order: 1 });
documentCollectionSchema.index({ projectId: 1, status: 1 });
documentCollectionSchema.index({ documents: 1 });

// Method to add document to collection
documentCollectionSchema.methods.addDocument = function(this: IDocumentCollection, documentId: mongoose.Types.ObjectId) {
  if (!this.documents.includes(documentId)) {
    this.documents.push(documentId);
    this.settings.aggregationOrder.push(documentId);
    this.stats.documentCount = this.documents.length;
    this.stats.lastModified = new Date();
  }
  return this.save();
};

// Method to remove document from collection
documentCollectionSchema.methods.removeDocument = function(this: IDocumentCollection, documentId: mongoose.Types.ObjectId) {
  this.documents = this.documents.filter(id => !id.equals(documentId));
  this.settings.aggregationOrder = this.settings.aggregationOrder.filter(id => !id.equals(documentId));
  this.settings.hiddenDocuments = this.settings.hiddenDocuments.filter(id => !id.equals(documentId));
  this.stats.documentCount = this.documents.length;
  this.stats.lastModified = new Date();
  return this.save();
};

// Method to hide document from extraction
documentCollectionSchema.methods.hideDocument = function(this: IDocumentCollection, documentId: mongoose.Types.ObjectId) {
  if (this.documents.includes(documentId) && !this.settings.hiddenDocuments.includes(documentId)) {
    this.settings.hiddenDocuments.push(documentId);
    this.stats.lastModified = new Date();
  }
  return this.save();
};

// Method to show document in extraction
documentCollectionSchema.methods.showDocument = function(this: IDocumentCollection, documentId: mongoose.Types.ObjectId) {
  this.settings.hiddenDocuments = this.settings.hiddenDocuments.filter(id => !id.equals(documentId));
  this.stats.lastModified = new Date();
  return this.save();
};

// Method to reorder documents
documentCollectionSchema.methods.reorderDocuments = function(this: IDocumentCollection, newOrder: mongoose.Types.ObjectId[]) {
  // Validate that all documents in newOrder exist in the collection
  const validOrder = newOrder.filter(id => this.documents.some(docId => docId.equals(id)));
  this.settings.aggregationOrder = validOrder;
  this.stats.lastModified = new Date();
  return this.save();
};

// Method to aggregate extracted data from all visible documents
documentCollectionSchema.methods.aggregateExtractedData = async function(this: IDocumentCollection, columnId: string) {
  const Document = mongoose.models.Document || mongoose.model('Document');
  
  // Get visible documents (not hidden)
  const visibleDocuments = this.documents.filter(docId => 
    !this.settings.hiddenDocuments.some(hiddenId => hiddenId.equals(docId))
  );
  
  if (visibleDocuments.length === 0) {
    return {
      value: '',
      type: 'text',
      status: null,
      confidence: 0,
      extractedAt: new Date(),
      extractedBy: { method: 'ai' },
      sourceDocuments: [],
      aggregationType: 'concatenated'
    };
  }
  
  // Fetch documents with their extracted data
  const documents = await Document.find({ _id: { $in: visibleDocuments } });
  
  // Order documents according to aggregationOrder
  const orderedDocuments = this.settings.aggregationOrder
    .map(orderedId => documents.find(doc => doc._id.equals(orderedId)))
    .filter(Boolean)
    .concat(documents.filter(doc => 
      !this.settings.aggregationOrder.some(orderedId => orderedId.equals(doc._id))
    ));
  
  // Extract and aggregate data
  const extractedValues = orderedDocuments
    .map(doc => doc.extractedData.get(columnId))
    .filter(data => data && data.value);
  
  if (extractedValues.length === 0) {
    return {
      value: '',
      type: 'text',
      status: null,
      confidence: 0,
      extractedAt: new Date(),
      extractedBy: { method: 'ai' },
      sourceDocuments: [],
      aggregationType: 'concatenated'
    };
  }
  
  // Aggregate based on type and content
  let aggregatedValue = '';
  let aggregationType = 'concatenated';
  let averageConfidence = extractedValues.reduce((sum, val) => sum + val.confidence, 0) / extractedValues.length;
  
  if (extractedValues.length === 1) {
    aggregatedValue = extractedValues[0].value;
    aggregationType = 'single';
  } else {
    // For multiple values, concatenate with separator
    aggregatedValue = extractedValues.map(val => val.value).join(' | ');
    aggregationType = 'concatenated';
  }
  
  const aggregatedData = {
    value: aggregatedValue,
    type: extractedValues[0].type,
    status: extractedValues.every(val => val.status === 'yes') ? 'yes' : 
            extractedValues.some(val => val.status === 'no') ? 'no' : 'pending',
    confidence: averageConfidence,
    extractedAt: new Date(),
    extractedBy: { method: 'ai' },
    sourceDocuments: orderedDocuments.map(doc => doc._id),
    aggregationType
  };
  
  // Store the aggregated data
  this.extractedData.set(columnId, aggregatedData);
  this.markModified('extractedData');
  await this.save();
  
  return aggregatedData;
};

// Method to update collection stats
documentCollectionSchema.methods.updateStats = async function(this: IDocumentCollection) {
  const Document = mongoose.models.Document || mongoose.model('Document');
  
  const stats = await Document.aggregate([
    { $match: { _id: { $in: this.documents } } },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalSize: { $sum: '$fileMetadata.size' }
      }
    }
  ]);
  
  const result = stats[0] || { totalCount: 0, totalSize: 0 };
  
  this.stats.documentCount = result.totalCount;
  this.stats.totalSize = result.totalSize;
  this.stats.lastModified = new Date();
  
  return this.save();
};

// Static method to get collections by project
documentCollectionSchema.statics.getByProject = function(projectId: mongoose.Types.ObjectId, options: any = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'order',
    sortOrder = 'asc',
    status = 'active'
  } = options;
  
  const query: any = { projectId, status };
  
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('documents')
    .exec();
};

export default mongoose.models.DocumentCollection || mongoose.model<IDocumentCollection>('DocumentCollection', documentCollectionSchema);
