// Simple test route to verify API infrastructure
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("🔧 Test API called - GET");
  
  return new Response("GET test working!", {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(request: NextRequest) {
  console.log("🔧 Test API called - POST");
  
  try {
    const body = await request.json();
    console.log("Test POST body:", body);
    
    return new Response(JSON.stringify({
      message: "POST test working!",
      received: body,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Test POST error: " + error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
