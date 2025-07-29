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

# Ensure Prisma binaries are available
echo "Checking Prisma binaries..."
if [ ! -f "/app/prisma-query-engine-debian-openssl-1.1.x" ]; then
    echo "Prisma query engine not found, fetching..."
    prisma py fetch
    
    # Try to find and copy the binary from multiple possible locations
    BINARY_FOUND=false
    
    # Check in /tmp/.cache/prisma-python
    if [ -d "/tmp/.cache/prisma-python" ]; then
        BINARY_PATH=$(find /tmp/.cache/prisma-python -name "prisma-query-engine-*" -executable 2>/dev/null | head -1)
        if [ -n "$BINARY_PATH" ] && [ -f "$BINARY_PATH" ]; then
            cp "$BINARY_PATH" /app/prisma-query-engine-debian-openssl-1.1.x
            chmod +x /app/prisma-query-engine-debian-openssl-1.1.x
            echo "✅ Copied Prisma binary from $BINARY_PATH"
            BINARY_FOUND=true
        fi
    fi
    
    # Check in /root/.cache/prisma-python if not found yet
    if [ "$BINARY_FOUND" = false ] && [ -d "/root/.cache/prisma-python" ]; then
        BINARY_PATH=$(find /root/.cache/prisma-python -name "prisma-query-engine-*" -executable 2>/dev/null | head -1)
        if [ -n "$BINARY_PATH" ] && [ -f "$BINARY_PATH" ]; then
            cp "$BINARY_PATH" /app/prisma-query-engine-debian-openssl-1.1.x
            chmod +x /app/prisma-query-engine-debian-openssl-1.1.x
            echo "✅ Copied Prisma binary from $BINARY_PATH"
            BINARY_FOUND=true
        fi
    fi
    
    if [ "$BINARY_FOUND" = false ]; then
        echo "❌ Could not find Prisma query engine binary in cache directories"
        echo "Available files in /tmp/.cache/prisma-python:"
        find /tmp/.cache/prisma-python -type f 2>/dev/null || echo "Directory not found"
        echo "Available files in /root/.cache/prisma-python:"
        find /root/.cache/prisma-python -type f 2>/dev/null || echo "Directory not found"
        
        # Try running without custom binary path
        echo "Attempting to run migrations without custom binary path..."
        unset PRISMA_QUERY_ENGINE_BINARY
        unset PRISMA_CLI_QUERY_ENGINE_BINARY
    fi
else
    echo "✅ Prisma query engine binary found at /app/prisma-query-engine-debian-openssl-1.1.x"
fi

# Run Prisma migrations
echo "Running Prisma migrations..."

# Debug: Show current environment variables
echo "Current Prisma environment variables:"
echo "PRISMA_QUERY_ENGINE_BINARY: ${PRISMA_QUERY_ENGINE_BINARY:-not set}"
echo "PRISMA_CLI_QUERY_ENGINE_BINARY: ${PRISMA_CLI_QUERY_ENGINE_BINARY:-not set}"

if ! prisma migrate deploy; then
    echo "❌ ERROR: Prisma migrations failed"
    echo "Check your database connection and migration files"
    exit 1
fi

echo "✅ Migrations completed successfully"

# Start FastAPI server
echo "Starting FastAPI server..."
exec uvicorn main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
