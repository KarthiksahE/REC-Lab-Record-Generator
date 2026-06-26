FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LIBREOFFICE_PATH=/usr/bin/soffice

# Install LibreOffice headless, system fonts, and metrically-compatible MS Office fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-java-common \
    fonts-liberation \
    fonts-crosextra-carlito \
    fonts-crosextra-caladea \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
RUN fc-cache -f -v

WORKDIR /workspace

# Copy requirements and install
COPY requirements.txt /workspace/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . /workspace/

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
