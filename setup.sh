#!/bin/bash

# SECORA VAPT Platform - Setup Script
# This script sets up the complete SECORA platform

set -e

echo "🚀 SECORA VAPT Platform Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}" >&2; exit 1; }
command -v go >/dev/null 2>&1 || { echo -e "${RED}❌ Go is required but not installed.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"
echo -e "${GREEN}✓ Go $(go version | awk '{print $3}')${NC}"
echo ""

# Check for PostgreSQL and Redis
if command -v psql >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL installed${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found. You'll need to install it or use Docker.${NC}"
fi

if command -v redis-cli >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis installed${NC}"
else
    echo -e "${YELLOW}⚠ Redis not found. You'll need to install it or use Docker.${NC}"
fi
echo ""

# Setup environment
echo "🔧 Setting up environment..."

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-secret-key-here-min-32-chars/$JWT_SECRET/" .env
    else
        sed -i "s/your-secret-key-here-min-32-chars/$JWT_SECRET/" .env
    fi
    
    echo -e "${GREEN}✓ .env file created with generated JWT secret${NC}"
    echo -e "${YELLOW}⚠ Please update OPENAI_API_KEY and DATABASE_URL in .env${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists, skipping...${NC}"
fi
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
npm install bullmq ioredis jsdom
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Generate Prisma client
echo "🗄️  Setting up database..."
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Ask if user wants to run migrations
read -p "Run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma migrate dev --name init
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${YELLOW}⚠ Skipping migrations. Run 'npx prisma migrate dev' later.${NC}"
fi
echo ""

# Build Go scanner
echo "🔨 Building Go scanner..."
cd scan-engine
go build -o scan-engine main.go
chmod +x scan-engine
echo -e "${GREEN}✓ Go scanner built successfully${NC}"
cd ..
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..
echo ""

# Create scan-results directory
echo "📁 Creating directories..."
mkdir -p backend/scan-results
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Summary
echo "================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Update your .env file with:"
echo "   - DATABASE_URL (PostgreSQL connection string)"
echo "   - OPENAI_API_KEY (optional, for AI features)"
echo ""
echo "2. Start the services:"
echo "   ${BLUE}# Terminal 1: Redis${NC}"
echo "   redis-server"
echo ""
echo "   ${BLUE}# Terminal 2: Backend${NC}"
echo "   cd backend && npm run dev"
echo ""
echo "   ${BLUE}# Terminal 3: Frontend${NC}"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Access the platform:"
echo "   Frontend: ${BLUE}http://localhost:3000${NC}"
echo "   Backend:  ${BLUE}http://localhost:5000${NC}"
echo ""
echo "4. Or use Docker:"
echo "   ${BLUE}docker-compose up -d${NC}"
echo ""
echo "📚 Documentation:"
echo "   - SECORA_VAPT_PLATFORM_README.md"
echo "   - IMPLEMENTATION_STATUS.md"
echo ""
echo -e "${GREEN}Happy scanning! 🔒${NC}"
