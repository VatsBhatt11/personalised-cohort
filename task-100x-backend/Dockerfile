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

# Copy and make startup script executable
COPY start.sh .
RUN chmod +x start.sh

# Generate Prisma client as root (this usually works better)
RUN prisma generate

# Create non-root user and set permissions
RUN useradd -m -u 1000 app && \
    chown -R app:app /app && \
    mkdir -p /home/app/.cache && \
    chown -R app:app /home/app/.cache

USER app

# Set environment for runtime
ENV HOME=/home/app

EXPOSE $PORT

CMD ["./start.sh"]