#!/bin/bash

# Quick test script for local MCP server

echo "🧪 Testing PropFirms MCP Server Locally"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "   Run ./setup.sh first"
    exit 1
fi

# Load environment variables
source .env

# Check if build exists
if [ ! -d "build" ]; then
    echo "📦 Building project..."
    npm run build
fi

echo "🚀 Starting MCP HTTP server..."
echo ""
echo "Server will start on port ${MCP_SERVER_PORT:-3001}"
echo "Press Ctrl+C to stop"
echo ""
echo "Test with:"
echo "  curl http://localhost:${MCP_SERVER_PORT:-3001}/health"
echo ""

# Start the server
npm start
