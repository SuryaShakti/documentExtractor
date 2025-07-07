#!/bin/bash

# Fix Pending Documents - Utility Script
# This script will help you process all pending documents in your project

echo "🔧 Document Extractor - Fix Pending Documents"
echo "=============================================="
echo ""

# Check if project ID is provided
if [ -z "$1" ]; then
  echo "❌ Error: Project ID is required"
  echo "Usage: ./fix-pending-documents.sh <PROJECT_ID>"
  echo ""
  echo "Example: ./fix-pending-documents.sh 6856d09bb57f725417a0fac8"
  exit 1
fi

PROJECT_ID="$1"
API_URL="http://localhost:3000/api/projects/${PROJECT_ID}/documents/process-pending"

echo "📋 Project ID: $PROJECT_ID"
echo "🔗 API URL: $API_URL"
echo ""

# Get auth token from user (in a real app, you'd handle this differently)
echo "🔐 This script requires authentication."
echo "Please obtain an auth token and set it as an environment variable:"
echo "export AUTH_TOKEN='your_jwt_token_here'"
echo ""

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Error: AUTH_TOKEN environment variable not set"
  echo "Please set your authentication token and try again."
  exit 1
fi

echo "🚀 Processing pending documents..."

# Make the API call
response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN")

# Check if curl was successful
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to make API request"
  exit 1
fi

echo "📊 Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "✅ Script completed!"
echo ""
echo "💡 Tips:"
echo "  - Check your project dashboard to see the updated document statuses"
echo "  - Documents should change from 'pending' to 'processing' then 'completed'"
echo "  - Processing may take a few minutes depending on the number of documents"
echo "  - If some documents fail, you can re-run this script"
