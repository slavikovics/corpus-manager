FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/fonts && \
    ln -sf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /app/fonts/DejaVuSans.ttf && \
    ln -sf /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf /app/fonts/DejaVuSans-Bold.ttf

RUN useradd -m -u 1000 appuser && \
    mkdir -p /uploads && \
    chown -R appuser:appuser /uploads && \
    chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]