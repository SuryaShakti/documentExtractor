#!/usr/bin/env node
/**
 * MongoDB Connection Test Script
 * Run this to test MongoDB connectivity and diagnose issues
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Connection test function
async function testConnection(uri, name) {
  console.log(`\n🔄 Testing ${name}...`);
  console.log(`URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  
  try {
    const connection = await mongoose.createConnection(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    
    await connection.asPromise();
    console.log(`✅ ${name} - Connected successfully!`);
    console.log(`   Host: ${connection.host}`);
    console.log(`   Database: ${connection.name}`);
    
    await connection.close();
    return true;
    
  } catch (error) {
    console.log(`❌ ${name} - Failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 MongoDB Connection Diagnostics\n');
  console.log('==========================================');
  
  const uris = [
    {
      name: 'Primary URI',
      uri: process.env.MONGODB_URI
    },
    {
      name: 'Alternative URI 1',
      uri: process.env.MONGODB_URI_ALT1
    },
    {
      name: 'Alternative URI 2', 
      uri: process.env.MONGODB_URI_ALT2
    },
    {
      name: 'Local MongoDB',
      uri: process.env.MONGODB_URI_LOCAL
    },
    {
      name: 'Fixed Atlas URI (with appName)',
      uri: process.env.MONGODB_URI?.replace('social-media', 'documentextractor') || null
    },
    {
      name: 'Simple Atlas URI (minimal params)',
      uri: 'mongodb+srv://suryashaktidev:qG4aSsyfpAFSFD4B@social-media.ofhxyn7.mongodb.net/documentExtraction'
    }
  ];
  
  let successCount = 0;
  
  for (const { name, uri } of uris) {
    if (!uri) {
      console.log(`\n⏭️  Skipping ${name} - No URI provided`);
      continue;
    }
    
    const success = await testConnection(uri, name);
    if (success) successCount++;
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n==========================================');
  console.log(`📊 Results: ${successCount}/${uris.filter(u => u.uri).length} connections successful\n`);
  
  if (successCount === 0) {
    console.log('🔧 Troubleshooting Tips:');
    console.log('1. Check MongoDB Atlas Dashboard:');
    console.log('   - Is your cluster running (not paused)?');
    console.log('   - Is your IP address whitelisted?');
    console.log('   - Are the credentials correct?');
    console.log('');
    console.log('2. Network Issues:');
    console.log('   - Try connecting from a different network');
    console.log('   - Check if your firewall blocks MongoDB ports');
    console.log('   - Test with MongoDB Compass first');
    console.log('');
    console.log('3. Alternative Solutions:');
    console.log('   - Set up local MongoDB for development');
    console.log('   - Create a new MongoDB Atlas cluster');
    console.log('   - Try MongoDB Atlas free tier');
  }
  
  process.exit(successCount > 0 ? 0 : 1);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);
