import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/lib/models/User";
import connectDB from "@/lib/database/mongodb";
import { withErrorHandling, getRequestBody } from "@/lib/middleware/auth";
import { validateRequestBody, loginUserSchema } from "@/lib/utils/validation";

async function loginHandler(req: NextRequest) {
  await connectDB();

  const body = await getRequestBody(req);

  // Validate request body
  const validation = validateRequestBody(loginUserSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
        details: validation.details,
      },
      { status: 400 }
    );
  }

  const { email, password } = validation.data;

  // Check for user
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid credentials",
      },
      { status: 401 }
    );
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid credentials",
      },
      { status: 401 }
    );
  }

  // Check if user is active
  if (user.status !== "active") {
    return NextResponse.json(
      {
        success: false,
        error: "Account is inactive. Please contact support.",
      },
      { status: 401 }
    );
  }

  // Check subscription expiry
  if (
    user.subscription.expiryDate &&
    new Date() > user.subscription.expiryDate
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Subscription has expired. Please renew your plan.",
      },
      { status: 401 }
    );
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );

  // Update login stats
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  return NextResponse.json({
    success: true,
    data: {
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        subscription: user.subscription,
        preferences: user.preferences,
        stats: user.stats,
      },
    },
  });
}

export const POST = withErrorHandling(loginHandler);
