// Extract-cell route with debugging and better error handling
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🎯 Extract-cell API called!");
  
  try {
    // Log the request details
    console.log("Request URL:", request.url);
    console.log("Request method:", request.method);
    
    // Try to parse the body
    let body;
    try {
      body = await request.json();
      console.log("Parsed body:", JSON.stringify(body, null, 2));
    } catch (bodyError) {
      console.error("Body parsing error:", bodyError);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid JSON in request body",
        details: bodyError.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Create response data
    const responseData = {
      success: true,
      message: "Extract cell API working!",
      timestamp: new Date().toISOString(),
      received: body,
      mockResult: {
        columnId: body?.columnId || "unknown",
        value: "Mock extracted value for testing",
        confidence: 0.95,
        promptUsed: body?.customPrompt || "Default prompt",
        isCustomPrompt: !!(body?.customPrompt)
      }
    };
    
    console.log("Response data:", JSON.stringify(responseData, null, 2));
    
    // Return response with explicit headers
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    
  } catch (error: any) {
    console.error("❌ Extract cell API error:", error);
    
    // Return error response with explicit headers
    return new Response(JSON.stringify({
      success: false,
      error: "Extract cell error: " + error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Add a GET handler for testing
export async function GET(request: NextRequest) {
  console.log("🎯 Extract-cell GET called!");
  
  return new Response(JSON.stringify({
    success: true,
    message: "Extract cell GET endpoint working!",
    timestamp: new Date().toISOString(),
    method: "GET"
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
