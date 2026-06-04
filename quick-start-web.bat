@echo off
echo 🛡️  SECORA VAPT Platform - Web Interface Setup
echo ==============================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    echo    Then run this script again.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Start PostgreSQL and Redis
echo 🚀 Starting database and Redis services...
docker-compose up -d postgres redis

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check if services are running
docker-compose ps | findstr "postgres.*Up" >nul
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL is running
) else (
    echo ❌ PostgreSQL failed to start
    pause
    exit /b 1
)

docker-compose ps | findstr "redis.*Up" >nul
if %errorlevel% equ 0 (
    echo ✅ Redis is running
) else (
    echo ❌ Redis failed to start
    pause
    exit /b 1
)

REM Update environment variables
echo 🔧 Updating environment configuration...
cd backend

REM Create .env file
(
echo # Database Configuration
echo DATABASE_URL=postgresql://secora:secora_dev_password@localhost:5432/secora
echo.
echo # Redis Configuration
echo REDIS_URL=redis://localhost:6379
echo.
echo # JWT Secret
echo JWT_SECRET=secora-super-secret-jwt-key-change-in-production
echo.
echo # CORS Origin
echo CORS_ORIGIN=http://localhost:3000
echo.
echo # Server Configuration
echo NODE_ENV=development
echo PORT=5000
echo.
echo # OpenAI API Key ^(Optional - for AI features^)
echo OPENAI_API_KEY=sk-proj-dummy-key-for-testing-12345
echo.
echo # Logging
echo LOG_LEVEL=info
echo.
echo # AI Settings
echo AI_MODEL=gpt-4o-mini
echo AI_MAX_TOKENS=1000
echo AI_TEMPERATURE=0.4
echo MOCK_AI_MODE=false
echo.
echo # Directories
echo SCAN_RESULTS_DIR=backend/scan-results
echo ASSETS_DIR=assets
) > .env

echo ✅ Environment configured

REM Generate Prisma client and run migrations
echo 🗄️  Setting up database schema...
call npx prisma generate
call npx prisma migrate dev --name initial_setup --skip-generate

if %errorlevel% equ 0 (
    echo ✅ Database schema created
) else (
    echo ❌ Database setup failed
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Go back to root
cd ..

REM Install frontend dependencies
echo 🎨 Setting up frontend...
cd frontend
call npm install
cd ..

echo.
echo 🎉 SECORA Web Platform is ready!
echo ==============================================
echo.
echo 🚀 To start the platform:
echo    1. Backend:  cd backend ^&^& npm run dev
echo    2. Frontend: cd frontend ^&^& npm run dev
echo.
echo 🌐 Access URLs:
echo    • Frontend: http://localhost:3000
echo    • Backend:  http://localhost:5000
echo.
echo 🔍 To scan your Roundcube:
echo    1. Open http://localhost:3000
echo    2. Go to 'New Scan'
echo    3. Enter: http://192.168.31.113/roundcube/
echo    4. Select 'FULL_VAPT' profile
echo    5. Enable 'Aggressive Mode'
echo    6. Click 'Start Scan'
echo.
echo 📊 Features available:
echo    • Real-time scan progress
echo    • Live vulnerability detection
echo    • Screenshot capture
echo    • Professional PDF reports
echo    • Interactive findings viewer
echo.
echo 🛡️  Ready for professional VAPT testing!
echo.
pause
