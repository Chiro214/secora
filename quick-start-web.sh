#!/bin/bash

# SECORA Web Platform Quick Start
echo "🛡️  SECORA VAPT Platform - Web Interface Setup"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Docker is running"

# Start PostgreSQL and Redis
echo "🚀 Starting database and Redis services..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "postgres.*Up"; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

if docker-compose ps | grep -q "redis.*Up"; then
    echo "✅ Redis is running"
else
    echo "❌ Redis failed to start"
    exit 1
fi

# Update environment variables for Docker services
echo "🔧 Updating environment configuration..."
cd backend

# Create .env with Docker service URLs
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://secora:secora_dev_password@localhost:5432/secora

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=secora-super-secret-jwt-key-change-in-production

# CORS Origin
CORS_ORIGIN=http://localhost:3000

# Server Configuration
NODE_ENV=development
PORT=5000

# OpenAI API Key (Optional - for AI features)
OPENAI_API_KEY=sk-proj-dummy-key-for-testing-12345

# Logging
LOG_LEVEL=info

# AI Settings
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.4
MOCK_AI_MODE=false

# Directories
SCAN_RESULTS_DIR=backend/scan-results
ASSETS_DIR=assets
EOF

echo "✅ Environment configured"

# Generate Prisma client and run migrations
echo "🗄️  Setting up database schema..."
npx prisma generate
npx prisma migrate dev --name initial_setup --skip-generate

if [ $? -eq 0 ]; then
    echo "✅ Database schema created"
else
    echo "❌ Database setup failed"
    exit 1
fi

# Install any missing dependencies
echo "📦 Installing dependencies..."
npm install --silent

# Go back to root directory
cd ..

# Install frontend dependencies
echo "🎨 Setting up frontend..."
cd frontend
npm install --silent
cd ..

echo ""
echo "🎉 SECORA Web Platform is ready!"
echo "=============================================="
echo ""
echo "🚀 To start the platform:"
echo "   1. Backend:  cd backend && npm run dev"
echo "   2. Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Access URLs:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend:  http://localhost:5000"
echo ""
echo "🔍 To scan your Roundcube:"
echo "   1. Open http://localhost:3000"
echo "   2. Go to 'New Scan'"
echo "   3. Enter: http://192.168.31.113/roundcube/"
echo "   4. Select 'FULL_VAPT' profile"
echo "   5. Enable 'Aggressive Mode'"
echo "   6. Click 'Start Scan'"
echo ""
echo "📊 Features available:"
echo "   • Real-time scan progress"
echo "   • Live vulnerability detection"
echo "   • Screenshot capture"
echo "   • Professional PDF reports"
echo "   • Interactive findings viewer"
echo ""
echo "🛡️  Ready for professional VAPT testing!"
