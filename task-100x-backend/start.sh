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

# Verify the binary exists at the expected location
EXPECTED_BINARY="/tmp/.cache/prisma-python/binaries/5.17.0/393aa359c9ad4a4bb28630fb5613f9c281cde053/prisma-query-engine-debian-openssl-1.1.x"
if [ -f "$EXPECTED_BINARY" ]; then
    echo "✅ Prisma query engine binary found at $EXPECTED_BINARY"
    chmod +x "$EXPECTED_BINARY" 2>/dev/null || true
else
    echo "⚠️  Binary not found at expected location, fetching and copying..."
    prisma py fetch
    
    # Debug: Show what files were downloaded
    echo "Files in Prisma cache:"
    find /tmp/.cache/prisma-python -type f 2>/dev/null | head -20
    
    # Look for any query engine binary in multiple possible locations
    SOURCE_BINARY=""
    
    # Try different possible paths
    for pattern in "query-engine-debian-openssl-1.1.x" "query_engine-debian-openssl-1.1.x" "*query*engine*" "prisma-query-engine-*"; do
        echo "Searching for pattern: $pattern"
        FOUND=$(find /tmp/.cache/prisma-python -name "$pattern" -type f 2>/dev/null | head -1)
        if [ -n "$FOUND" ] && [ -f "$FOUND" ]; then
            SOURCE_BINARY="$FOUND"
            echo "Found binary with pattern '$pattern': $SOURCE_BINARY"
            break
        fi
    done
    
    if [ -n "$SOURCE_BINARY" ] && [ -f "$SOURCE_BINARY" ]; then
        # Copy to the expected location
        TARGET_DIR="/tmp/.cache/prisma-python/binaries/5.17.0/393aa359c9ad4a4bb28630fb5613f9c281cde053"
        TARGET_BINARY="$TARGET_DIR/prisma-query-engine-debian-openssl-1.1.x"
        mkdir -p "$TARGET_DIR"
        cp "$SOURCE_BINARY" "$TARGET_BINARY"
        chmod +x "$TARGET_BINARY"
        echo "✅ Copied binary from $SOURCE_BINARY to $TARGET_BINARY"
    else
        echo "❌ Could not find any query engine binary"
        echo "All files in cache:"
        find /tmp/.cache/prisma-python -type f 2>/dev/null
    fi
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
