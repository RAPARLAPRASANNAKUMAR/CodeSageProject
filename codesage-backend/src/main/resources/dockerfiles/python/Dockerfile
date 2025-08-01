# Use a slim, official Python base image
FROM python:3.9-slim

WORKDIR /app

# Copy the user's Python script
COPY script.py .

# The -u flag is for unbuffered output, essential for streaming
CMD ["python", "-u", "script.py"]
