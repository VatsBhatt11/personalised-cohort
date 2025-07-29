FROM python:3.11-slim-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    netcat-traditional \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment to avoid binary path issues
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-1.1.x"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=false

# Generate everything as root, create world-readable cache
RUN prisma py fetch && \
    prisma generate && \
    chmod -R 755 /root/.cache 2>/dev/null || true

# Make startup script executable
RUN chmod +x start.sh

# Don't switch users - run as root in production
EXPOSE $PORT

CMD ["./start.sh"]