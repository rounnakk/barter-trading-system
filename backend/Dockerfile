# Use a smaller base image
FROM python:3.11-slim AS builder

# Set the working directory
WORKDIR /app

# Install system dependencies and PostgreSQL development packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    libpq-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install huggingface_hub==0.24.2
RUN pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu torchaudio==2.3.1+cpu --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
    
RUN pip install langchainhub==0.1.21

# Start a new stage from the slim image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install MySQL client and PostgreSQL client in the final image
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only the necessary files from the builder image
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy the rest of the project
COPY . .

# Expose the port on which the FastAPI app will run
EXPOSE 8000

# Command to run the FastAPI app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Command to run the FastAPI app using uvicorn
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--access-log", "False"]
