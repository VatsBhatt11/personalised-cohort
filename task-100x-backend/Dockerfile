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

# Set Prisma environment variables to avoid permission issues
ENV PRISMA_CLI_QUERY_ENGINE_BINARY=/tmp/prisma-query-engine
ENV HOME=/tmp

# Generate Prisma client
RUN prisma generate

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