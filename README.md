# Document Extractor - Full Stack Application

A complete document extraction platform built with Next.js, Express.js, MongoDB, and AI integration. Extract structured data from documents using advanced AI models with a user-friendly interface.

## 🎯 Features Completed

### ✅ Backend Infrastructure
- **Express.js API Server** with comprehensive middleware
- **MongoDB Integration** with Mongoose ODM
- **User Authentication** with JWT tokens
- **File Upload** with Cloudinary integration
- **Admin Dashboard APIs** for user management
- **Project & Document Management** with full CRUD operations
- **AI Processing Simulation** for document extraction
- **Security Middleware** (CORS, Helmet, Rate Limiting)
- **Validation** with Joi schemas
- **Error Handling** and logging

### ✅ Frontend Application
- **Next.js 13** with TypeScript and Tailwind CSS
- **Authentication System** with login/register forms
- **Project Management** with sidebar navigation
- **Document Upload** with drag-and-drop support
- **AG-Grid Integration** for data visualization
- **Real-time Processing** status updates
- **Admin Dashboard** for user management
- **Responsive Design** with mobile support
- **State Management** with Zustand
- **Form Validation** with React Hook Form and Zod

### ✅ Database Models
- **User Model** with subscription management
- **Project Model** with grid configuration
- **Document Model** with extraction data tracking
- **Admin Features** for user analytics

### ✅ Authentication & Authorization
- **JWT-based Authentication**
- **Role-based Access Control** (User/Admin)
- **Protected Routes** middleware
- **Session Management**
- **Password Security** with bcrypt

### ✅ File Management
- **Cloudinary Integration** for file storage
- **Multiple File Upload** support
- **File Type Validation** (PDF, Word, Images, CSV, Text)
- **Storage Quota Management** by subscription plan
- **File Size Limitations**

### ✅ AI Integration Framework
- **Column-based Extraction** configuration
- **Multiple AI Model Support** (GPT-4, Claude, etc.)
- **Processing Status Tracking**
- **Confidence Scoring**
- **Manual Data Override** capabilities

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Cloudinary account (for file storage)

### Installation

1. **Clone and Setup**
```bash
cd /Users/surya/Desktop/PRACTICE_CODE/documentExtractor
chmod +x setup.sh
./setup.sh
```

2. **Manual Setup** (alternative)
```bash
# Install dependencies
npm install
npm run backend:install

# Initialize database
npm run backend:init

# Start development servers
npm run full:dev
```

### Environment Configuration

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://suryashaktidev:qG4aSsyfpAFSFD4B@social-media.ofhxyn7.mongodb.net/documentExtraction?retryWrites=true&w=majority&appName=social-media
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
CLOUDINARY_CLOUD_NAME=dyjd0hssi
CLOUDINARY_API_KEY=457629728783651
CLOUDINARY_API_SECRET=J85DaE0UWOjkKZG5o84BHRK-JU4
ADMIN_EMAIL=suryashakti1999@gmail.com
ADMIN_PASSWORD=Admin@1234
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=Document Extractor
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🔐 Login Credentials

### Admin Access
- **Email:** suryashakti1999@gmail.com
- **Password:** Admin@1234
- **Access:** Full admin dashboard, user management, analytics

### Demo User
- **Email:** user@example.com  
- **Password:** password123
- **Access:** Standard user features, sample project

## 📱 Application URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/v1/health
- **Admin Dashboard:** http://localhost:3000/admin

## 🛠 Architecture

### Frontend Structure
```
app/
├── auth/               # Authentication pages
├── dashboard/          # User dashboard
├── admin/             # Admin panel
components/
├── auth/              # Auth components
├── dashboard/         # Dashboard components
├── admin/             # Admin components
├── ui/                # Reusable UI components
lib/
├── api/               # API service layer
├── stores/            # Zustand state management
```

### Backend Structure
```
backend/
├── config/            # Database & service configs
├── controllers/       # Route handlers (future)
├── middleware/        # Custom middleware
├── models/           # MongoDB schemas
├── routes/           # API routes
├── scripts/          # Database scripts
├── utils/            # Utilities & validation
```

## 🎨 Key Features

### User Dashboard
- **Project Sidebar** with search and filtering
- **Document Grid** with AG-Grid for data visualization
- **Upload Interface** with drag-and-drop support
- **Column Management** for AI extraction configuration
- **Real-time Processing** status updates

### Admin Dashboard  
- **User Management** with detailed analytics
- **System Overview** with usage statistics
- **Subscription Management** with plan controls
- **Storage Analytics** and usage tracking

### Document Processing
- **AI Extraction Columns** with custom prompts
- **Multiple AI Models** (GPT-4, Claude, etc.)
- **Processing Pipeline** with status tracking
- **Data Validation** and confidence scoring
- **Manual Override** capabilities

## 📊 Subscription Plans

### Free Plan
- 3 projects maximum
- 100MB storage
- Basic AI extraction
- Export capabilities

### Basic Plan  
- 10 projects maximum
- 1GB storage  
- Advanced extraction
- Team collaboration

### Premium Plan
- 50 projects maximum
- 10GB storage
- All AI models
- Priority processing
- API access

## 🔧 Development Scripts

```bash
# Frontend development
npm run dev                 # Start Next.js dev server
npm run build              # Build for production
npm run lint               # Run ESLint

# Backend development  
npm run backend:dev        # Start Express.js dev server
npm run backend:install    # Install backend dependencies
npm run backend:init       # Initialize database

# Combined development
npm run full:dev          # Start both frontend and backend
npm run setup             # Full setup with dependencies and DB
```

## 🗄 Database Collections

### Users
- Authentication and profile information
- Subscription and billing details
- Usage statistics and preferences
- Admin flags and permissions

### Projects
- Project metadata and settings
- Grid configuration and column definitions
- Collaboration settings
- Processing statistics

### Documents
- File metadata and Cloudinary references
- Processing status and progress
- Extracted data per column
- Audit logs and analytics

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Role-based Access Control** (RBAC)
- **Input Validation** with Joi schemas
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for cross-origin requests
- **Helmet.js** for security headers
- **Password Hashing** with bcrypt
- **File Upload Security** with type validation

## 📈 Admin Features

### User Management
- View all users with filtering and pagination
- Update user details and subscription plans
- Suspend/reactivate user accounts
- View user activity and statistics

### Analytics Dashboard
- System overview with key metrics
- User growth and retention analytics
- Storage usage and subscription distribution
- Project and document statistics

### System Management
- Database cleanup utilities
- Export capabilities for reporting
- System health monitoring

## 🚀 Deployment Ready

The application is structured for easy deployment with:
- **Environment-based Configuration**
- **Production Build Scripts** 
- **MongoDB Cloud Integration**
- **Cloudinary CDN** for file storage
- **Error Handling** and logging
- **Health Check Endpoints**

## 🎯 Next Steps for Production

1. **AI Integration:** Connect real AI APIs (OpenAI, Anthropic)
2. **Payment Processing:** Integrate Stripe for subscriptions
3. **Email Service:** Add email notifications and verification
4. **Advanced Analytics:** Enhanced reporting and insights
5. **API Documentation:** Swagger/OpenAPI documentation
6. **Performance Optimization:** Caching and CDN setup
7. **Testing:** Unit and integration tests
8. **Monitoring:** Error tracking and performance monitoring

## 📞 Support

For questions or issues with the application:
- Check the console logs for error details
- Ensure MongoDB connection is working
- Verify environment variables are set correctly
- Check that both frontend and backend servers are running

---

**Built with ❤️ using Next.js, Express.js, MongoDB, and modern web technologies.**
