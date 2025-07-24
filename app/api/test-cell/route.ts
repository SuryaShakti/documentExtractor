// Test route to verify routing works
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Cell customization API is working!",
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Cell customization POST is working!",
    timestamp: new Date().toISOString()
  });
}
