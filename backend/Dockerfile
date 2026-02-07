# Aegis-1 Backend - MCP Server
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Environment variables (override at runtime)
ENV HOST=0.0.0.0
ENV PORT=8000
ENV MCP_SERVER_NAME=relief-ops
ENV GESTURE_WS_HOST=0.0.0.0
ENV GESTURE_WS_PORT=8765

# Expose ports
EXPOSE 8000
EXPOSE 8765

# Default command - runs MCP server
CMD ["python", "relief_ops.py"]

