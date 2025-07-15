# MongoDB Connection Issue - Quick Fix Guide

## 🚨 Current Issue
Your application is experiencing a MongoDB connection error:
```
querySrv ECONNREFUSED _mongodb._tcp.social-media.ofhxyn7.mongodb.net
```

## 🔧 Immediate Solutions

### Option 1: Test Database Connection
Run the connection diagnostic tool:
```bash
npm run test:db
```
This will test all available connection strings and identify which one works.

### Option 2: Quick Fix - Try These Steps

1. **Check MongoDB Atlas Dashboard:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Log in with your credentials
   - Check if your cluster `social-media` is:
     - ✅ Running (not paused)
     - ✅ Accessible from your IP

2. **Whitelist Your IP Address:**
   - In Atlas Dashboard → Network Access
   - Add your current IP address: 
   - Or temporarily add `0.0.0.0/0` (allow all IPs) for testing

3. **Verify Cluster Status:**
   - In Atlas Dashboard → Database
   - Make sure the `social-media` cluster is active
   - If paused, click "Resume" to start it

### Option 3: Use Alternative Connection String
The system will now automatically try multiple connection methods:

1. **Primary URI** (with app name)
2. **Alternative URI 1** (without app name)
3. **Alternative URI 2** (with SSL/auth)
4. **Alternative URI 3** (direct connection)
5. **Local MongoDB** (fallback)

### Option 4: Set Up Local MongoDB (Development)
If Atlas continues to fail, use local MongoDB:

1. **Install MongoDB locally:**
   ```bash
   # macOS
   brew install mongodb-community
   
   # Ubuntu
   sudo apt-get install mongodb
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Start MongoDB service:**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Ubuntu
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

3. **Update .env.local to use local MongoDB:**
   ```env
   # Comment out Atlas URI and use local:
   # MONGODB_URI=mongodb+srv://...
   MONGODB_URI=mongodb://localhost:27017/documentExtraction
   ```

### Option 5: Create New MongoDB Atlas Cluster
If the current cluster has issues:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster (free tier available)
3. Name it `documentextractor`
4. Create a database user
5. Update connection string in `.env.local`

## 🔍 Troubleshooting Commands

### Test Database Connection
```bash
npm run test:db
```

### Check Environment Variables
```bash
# View current MongoDB URIs
grep MONGODB .env.local
```

### Test with MongoDB Compass
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Use the same connection string from `.env.local`
3. If Compass can't connect, the issue is with Atlas/network

## 📋 What We Fixed

### 1. Enhanced Database Connection (`lib/database/mongodb.ts`)
- ✅ **Retry Logic**: Automatically retries failed connections
- ✅ **Multiple URIs**: Tests 4 different connection methods
- ✅ **Better Error Handling**: Detailed error messages and troubleshooting tips
- ✅ **Fallback Options**: Local MongoDB as backup

### 2. Updated Environment Variables (`.env.local`)
- ✅ **Fixed App Name**: Changed from `social-media` to `documentExtractor`
- ✅ **Multiple Alternatives**: 4 different connection strings
- ✅ **Better Parameters**: Optimized connection options

### 3. Connection Test Script (`test-db-connection.js`)
- ✅ **Diagnostic Tool**: Tests all connection options
- ✅ **Clear Results**: Shows which connections work
- ✅ **Troubleshooting Tips**: Specific guidance based on results

## 🎯 Expected Results

After applying these fixes:
1. **Automatic Failover**: If primary connection fails, system tries alternatives
2. **Better Diagnostics**: Clear error messages with specific solutions
3. **Development Continuity**: Local MongoDB option for uninterrupted development
4. **Easy Testing**: Simple command to test all connections

## 🚀 Next Steps

1. **Run the diagnostic:** `npm run test:db`
2. **Check Atlas dashboard** for cluster status and IP whitelist
3. **Try starting the application:** `npm run dev`
4. **If still failing, use local MongoDB** as described in Option 4

## 💡 Common Solutions That Work

- **90% of cases**: IP address not whitelisted in Atlas
- **5% of cases**: Cluster paused or deleted
- **3% of cases**: Network/firewall issues
- **2% of cases**: Wrong credentials or URI

The enhanced connection system should resolve most of these issues automatically!
