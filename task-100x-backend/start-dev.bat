@echo off
REM Task-100x Backend - Supabase Only Setup

echo 🚀 Task-100x Backend (Supabase Configuration)
echo ==========================================

echo.
echo ✅ Using your existing Supabase database
echo ✅ Your .env file is already configured
echo.

REM Start the services
echo 🏗️  Starting backend service...
docker compose up -d

echo.
echo 🎉 Backend is starting up!
echo.
echo 📊 Services available at:
echo    - Backend API: http://localhost:8000
echo    - API Documentation: http://localhost:8000/docs
echo    - OpenAPI Schema: http://localhost:8000/openapi.json
echo.
echo 🔧 Useful commands:
echo    - View logs: docker compose logs -f
echo    - Stop service: docker compose down
echo    - Restart service: docker compose restart
echo    - Access shell: docker compose exec backend bash
echo.
echo 📝 Note: The backend will auto-reload when you make code changes!
pause
