#!/bin/bash

# PropFirms Ticketing MCP Server Setup Script

set -e

echo "🚀 PropFirms Ticketing MCP Server Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from the mcp-server directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building MCP server..."
npm run build

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and set your configuration:"
    echo "   - TICKETING_BASE_URL (your server URL)"
    echo "   - TICKETING_API_KEY (generate a secure key)"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Generate API key suggestion
echo ""
echo "🔑 Generate a secure API key with this command:"
echo "   node -e \"console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))\""
echo ""

# Get absolute path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_PATH="$SCRIPT_DIR/build/index.js"

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Generate an API key:"
echo "   node -e \"console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "2. Add the API key to your main project's .env file:"
echo "   MCP_API_KEY=your_generated_key"
echo ""
echo "3. Edit mcp-server/.env and set:"
echo "   TICKETING_BASE_URL=https://your-domain.com"
echo "   TICKETING_API_KEY=your_generated_key"
echo ""
echo "4. Add to Claude Desktop config:"
echo ""
echo "   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "   {"
echo "     \"mcpServers\": {"
echo "       \"propfirms-ticketing\": {"
echo "         \"command\": \"node\","
echo "         \"args\": [\"$BUILD_PATH\"],"
echo "         \"env\": {"
echo "           \"TICKETING_BASE_URL\": \"https://your-domain.com\","
echo "           \"TICKETING_API_KEY\": \"your_generated_key\""
echo "         }"
echo "       }"
echo "     }"
echo "   }"
echo ""
echo "5. Restart Claude Desktop"
echo ""
echo "📖 For detailed instructions, see README.md"
echo "👥 For team usage guide, see TEAM_GUIDE.md"
echo ""
