# PropFirms Ticketing MCP Server - Dockerfile

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
# Skip prepare script since source files aren't copied yet
RUN npm install --ignore-scripts 2>&1 || { echo "=== NPM INSTALL FAILED ==="; cat /root/.npm/_logs/*.log 2>/dev/null; exit 1; }

# Copy source code
COPY src ./src

# Build the project
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3042

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3042/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the HTTP server
CMD ["node", "build/http-server.js"]
