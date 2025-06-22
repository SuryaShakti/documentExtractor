import { NextResponse } from 'next/server';
import connectDB from '@/lib/database/mongodb';

export async function GET() {
  const healthData = {
    success: true,
    message: 'Document Extractor API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    status: 'healthy',
    services: {
      api: 'active',
      fileUpload: 'ready',
      database: 'checking...'
    }
  };

  try {
    // Test database connection
    await connectDB();
    healthData.services.database = 'connected';
    
    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Health check - Database connection failed:', error);
    
    // Return partial health status even if database fails
    healthData.services.database = 'disconnected';
    healthData.status = 'partial';
    healthData.message = 'API running but database connection failed';
    
    return NextResponse.json(healthData, { status: 200 }); // Still return 200 for API availability
  }
}
