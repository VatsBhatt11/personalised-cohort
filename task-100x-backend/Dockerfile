FROM python:3.9-slim-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    netcat-traditional \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set basic Prisma environment variables
ENV HOME=/tmp

# Create cache directories
RUN mkdir -p /tmp/.cache/prisma-python

# Fetch Prisma binaries and generate client (without custom binary path first)
RUN prisma py fetch
RUN prisma generate

# Copy the query engine binary to the expected location with better error handling
RUN find /tmp/.cache/prisma-python -name "prisma-query-engine-*" -executable 2>/dev/null | head -1 | xargs -I {} cp {} /app/prisma-query-engine-debian-openssl-1.1.x || \
    find /root/.cache/prisma-python -name "prisma-query-engine-*" -executable 2>/dev/null | head -1 | xargs -I {} cp {} /app/prisma-query-engine-debian-openssl-1.1.x || \
    echo "Warning: Could not find prisma query engine binary"

# Make the binary executable
RUN chmod +x /app/prisma-query-engine-debian-openssl-1.1.x 2>/dev/null || true

# Now set the environment variables for runtime
ENV PRISMA_CLI_QUERY_ENGINE_BINARY=/app/prisma-query-engine-debian-openssl-1.1.x
ENV PRISMA_QUERY_ENGINE_BINARY=/app/prisma-query-engine-debian-openssl-1.1.x
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

# Copy and make startup script executable
COPY start.sh .
RUN chmod +x start.sh

# Create a non-root user
RUN useradd -m -u 1000 app && chown -R app:app /app
USER app

# Expose port (Render uses PORT environment variable)
EXPOSE $PORT

# Start the application with migrations
CMD ["./start.sh"]