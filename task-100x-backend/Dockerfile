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

# Create a startup script that handles migrations
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Waiting for database to be ready..."\n\
until nc -z $(echo $DATABASE_URL | sed -e "s|postgresql://[^@]*@||" -e "s|:[0-9]*/.*||") $(echo $DATABASE_URL | sed -e "s|.*:||" -e "s|/.*||") 2>/dev/null; do\n\
  echo "Database not ready, waiting..."\n\
  sleep 2\n\
done\n\
echo "Database is ready!"\n\
echo "Running Prisma migrations..."\n\
prisma migrate deploy\n\
echo "Starting FastAPI server..."\n\
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}' > start.sh \
&& chmod +x start.sh

# Create a non-root user
RUN useradd -m -u 1000 app && chown -R app:app /app
USER app

# Expose port (Render uses PORT environment variable)
EXPOSE $PORT

# Start the application with migrations
CMD ["./start.sh"]