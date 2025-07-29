FROM python:3.11-slim-bullseye

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

# Ensure Prisma binaries are fetched for the correct platform
RUN prisma py fetch

# Generate Prisma client
RUN prisma generate

# Copy and make startup script executable
COPY start.sh .
RUN chmod +x start.sh

# Create non-root user and set permissions
RUN useradd -m -u 1000 app && \
    chown -R app:app /app

USER app

EXPOSE $PORT

CMD ["./start.sh"]