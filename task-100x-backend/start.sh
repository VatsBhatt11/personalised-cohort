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

# First, ensure we have the binaries fetched
echo "Fetching Prisma binaries..."
prisma py fetch

# Check what files were actually downloaded
echo "Checking downloaded Prisma files:"
find /tmp/.cache/prisma-python -type f -name "*prisma*" 2>/dev/null || echo "No files found in /tmp/.cache"

# Try to find the correct binary and ensure it's executable
BINARY_DIRS=$(find /tmp/.cache/prisma-python -type d -name "*393aa359c9ad4a4bb28630fb5613f9c281cde053*" 2>/dev/null)
if [ -n "$BINARY_DIRS" ]; then
    for dir in $BINARY_DIRS; do
        echo "Checking directory: $dir"
        # Look for any query engine binary
        BINARY_FILES=$(find "$dir" -name "*query-engine*" -type f 2>/dev/null)
        for binary in $BINARY_FILES; do
            echo "Found binary: $binary"
            chmod +x "$binary" 2>/dev/null || true
            # Also copy to the expected location if it doesn't exist
            EXPECTED_PATH="$dir/prisma-query-engine-debian-openssl-1.1.x"
            if [ ! -f "$EXPECTED_PATH" ]; then
                cp "$binary" "$EXPECTED_PATH" 2>/dev/null && chmod +x "$EXPECTED_PATH" || true
                echo "Copied $binary to $EXPECTED_PATH"
            fi
        done
    done
fi

# Unset custom binary paths and let Prisma find its own binaries
unset PRISMA_QUERY_ENGINE_BINARY
unset PRISMA_CLI_QUERY_ENGINE_BINARY
echo "Unsetting custom binary paths, letting Prisma use default locations"

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

# Ensure Prisma binaries are available for FastAPI runtime
echo "Final Prisma binary check before starting server..."
prisma py fetch
echo "Prisma binaries ensured for FastAPI runtime"

# Start FastAPI server
echo "Starting FastAPI server..."
exec uvicorn main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
