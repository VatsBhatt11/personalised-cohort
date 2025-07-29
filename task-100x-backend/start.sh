#!/bin/bash
set -e

echo "=== Starting Task-100x Backend ==="
echo "HOST: ${HOST:-0.0.0.0}"
echo "PORT: ${PORT:-8000}"

# Function to test database connectivity
test_database() {
    echo "Testing database connectivity..."
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ ERROR: DATABASE_URL environment variable is not set!"
        exit 1
    fi
    
    # Extract host and port from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -e "s|postgresql://[^@]*@||" -e "s|:[0-9]*/.*||")
    DB_PORT=$(echo $DATABASE_URL | sed -e "s|.*:||" -e "s|/.*||")
    
    echo "Database Host: $DB_HOST"
    echo "Database Port: $DB_PORT"
    
    # Test if we can reach the database
    echo "Waiting for database to be ready..."
    RETRIES=30
    while [ $RETRIES -gt 0 ]; do
        if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
            echo "✅ Database is reachable!"
            return 0
        fi
        echo "Database not ready, waiting... ($RETRIES attempts left)"
        sleep 2
        RETRIES=$((RETRIES-1))
    done
    
    echo "❌ ERROR: Could not connect to database after 60 seconds"
    echo "Please check:"
    echo "1. DATABASE_URL is correctly set in Render environment variables"
    echo "2. Supabase database is running and accessible"
    echo "3. Database credentials are correct"
    exit 1
}

# Test database connectivity first
test_database

# Run Prisma migrations
echo "Running Prisma migrations..."
if ! prisma migrate deploy; then
    echo "❌ ERROR: Prisma migrations failed"
    echo "Check your database connection and migration files"
    exit 1
fi

echo "✅ Migrations completed successfully"

# Start FastAPI server
echo "Starting FastAPI server..."
exec uvicorn main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
