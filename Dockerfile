# Use official Python 3.11 image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    libxml2-dev \
    libxslt-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip wheel setuptools && \
    pip install --no-cache-dir -r requirements.txt && \
    playwright install && \
    playwright install-deps

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Expose port
EXPOSE 10000

# Run application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "10000"]