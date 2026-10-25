FROM node:22-bookworm-slim

# Install Python 3 + headless OpenCV runtime dependencies so RapidOCR ONNX works 24/7 in Railway cloud
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ca-certificates \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY . .

CMD ["node", "bot.mjs"]
