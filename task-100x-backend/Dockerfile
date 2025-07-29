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

# Create cache directories and set proper permissions
RUN mkdir -p /tmp/.cache/prisma-python && \
    mkdir -p /root/.cache/prisma-python

# Fetch Prisma binaries and generate client (without custom binary path)
RUN prisma py fetch
RUN prisma generate

# Find and copy the query engine binary to the expected location
RUN find /tmp/.cache/prisma-python -name "query-engine-debian-openssl-1.1.x" -path "*/node_modules/@prisma/engines/*" -exec sh -c 'for binary; do dir=$(dirname "$binary" | sed "s|/node_modules/@prisma/engines||"); cp "$binary" "$dir/prisma-query-engine-debian-openssl-1.1.x"; chmod +x "$dir/prisma-query-engine-debian-openssl-1.1.x"; echo "Copied $binary to $dir/prisma-query-engine-debian-openssl-1.1.x"; done' _ {} +

# Copy and make startup script executable
COPY start.sh .
RUN chmod +x start.sh

# Create a non-root user and give proper permissions
RUN useradd -m -u 1000 app && \
    chown -R app:app /app && \
    chown -R app:app /tmp/.cache 2>/dev/null || true && \
    chown -R app:app /root/.cache 2>/dev/null || true

USER app

# Expose port (Render uses PORT environment variable)
EXPOSE $PORT

# Start the application with migrations
CMD ["./start.sh"]