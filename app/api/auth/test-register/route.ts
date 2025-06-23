import { NextResponse } from 'next/server';

// Simple test endpoint that doesn't require database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Basic validation
    const { email, password, firstName, lastName } = body;
    
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Simulate user creation (without database)
    const mockUser = {
      id: 'test-user-' + Date.now(),
      email,
      firstName,
      lastName,
      role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    // Create a test JWT token
    const mockToken = 'test-jwt-token-' + Date.now();

    return NextResponse.json({
      success: true,
      message: 'Test registration successful (no database)',
      token: mockToken,
      user: mockUser,
      note: 'This is a test response. Database is not connected.'
    }, { status: 201 });

  } catch (error) {
    console.error('Test registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test registration failed'
    }, { status: 500 });
  }
}
