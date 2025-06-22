import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: {
    url?: string;
    publicId?: string;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      inApp: boolean;
    };
    language: string;
  };
  subscription: {
    plan: 'free' | 'basic' | 'premium';
    startDate?: Date;
    expiryDate?: Date;
    autoRenew: boolean;
  };
  stats: {
    projectsCount: number;
    documentsCount: number;
    storageUsed: number;
  };
  lastLogin?: Date;
  loginCount: number;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  fullName: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  canCreateProject(): boolean;
  canUploadDocument(fileSize: number): boolean;
  updateStats(): Promise<void>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  avatar: {
    url: String,
    publicId: String
  },
  preferences: {
    theme: { 
      type: String, 
      enum: ['light', 'dark'], 
      default: 'light' 
    },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free' // Ensure this always has a default
    },
    startDate: Date,
    expiryDate: Date,
    autoRenew: { type: Boolean, default: false }
  },
  stats: {
    projectsCount: { type: Number, default: 0 },
    documentsCount: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 } // in bytes
  },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Ensure subscription has proper defaults before saving
userSchema.pre('save', function(this: IUser, next) {
  // Ensure subscription exists and has proper defaults
  if (!this.subscription) {
    this.subscription = {
      plan: 'free',
      autoRenew: false
    };
  }
  
  // Ensure plan is set if undefined
  if (!this.subscription.plan) {
    this.subscription.plan = 'free';
  }
  
  next();
});

// Method to check password
userSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user can create more projects (INCREASED LIMITS)
userSchema.methods.canCreateProject = function(this: IUser): boolean {
  const limits = {
    free: 100,        // Increased from 3 to 100
    basic: 100,       // Increased from 10 to 100  
    premium: 100      // Increased from 50 to 100
  };
  
  // Handle undefined plan by defaulting to 'free'
  const userPlan = this.subscription?.plan || 'free';
  const limit = limits[userPlan] || limits.free;
  
  return this.stats.projectsCount < limit;
};

// Method to check if user can upload more documents (INCREASED LIMITS)
userSchema.methods.canUploadDocument = function(this: IUser, fileSize: number): boolean {
  const storageLimits = {
    free: 10 * 1024 * 1024 * 1024,    // Increased to 10GB
    basic: 50 * 1024 * 1024 * 1024,   // Increased to 50GB
    premium: 100 * 1024 * 1024 * 1024 // Increased to 100GB
  };
  
  // Handle undefined plan by defaulting to 'free'
  const userPlan = this.subscription?.plan || 'free';
  const limit = storageLimits[userPlan] || storageLimits.free;
  
  return (this.stats.storageUsed + fileSize) <= limit;
};

// Update user stats
userSchema.methods.updateStats = async function(this: IUser): Promise<void> {
  const Project = mongoose.models.Project || mongoose.model('Project');
  const Document = mongoose.models.Document || mongoose.model('Document');
  
  const [projectsCount, documentsData] = await Promise.all([
    Project.countDocuments({ ownerId: this._id }),
    Document.aggregate([
      { $match: { uploaderId: this._id } },
      { 
        $group: { 
          _id: null, 
          count: { $sum: 1 }, 
          totalSize: { $sum: '$fileMetadata.size' } 
        } 
      }
    ])
  ]);
  
  this.stats.projectsCount = projectsCount;
  this.stats.documentsCount = documentsData[0]?.count || 0;
  this.stats.storageUsed = documentsData[0]?.totalSize || 0;
  
  await this.save();
};

// Transform output (remove sensitive fields)
userSchema.methods.toJSON = function(this: IUser) {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
