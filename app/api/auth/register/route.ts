import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User';
import connectDB from '@/lib/database/mongodb';
import { withErrorHandling, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, registerUserSchema } from '@/lib/utils/validation';

async function registerHandler(req: NextRequest) {
  await connectDB();

  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(registerUserSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { email, password, firstName, lastName } = validation.data;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({
      success: false,
      error: 'User with this email already exists'
    }, { status: 400 });
  }

  // Check if this is the admin email
  const isAdmin = email === process.env.ADMIN_EMAIL;

  // Create user
  const user = await User.create({
    email,
    password, // Will be hashed by the pre-save middleware
    firstName,
    lastName,
    role: isAdmin ? 'admin' : 'user'
  });

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  // Update login stats
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  return NextResponse.json({
    success: true,
    message: 'User registered successfully',
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      subscription: user.subscription
    }
  }, { status: 201 });
}

export const POST = withErrorHandling(registerHandler);
