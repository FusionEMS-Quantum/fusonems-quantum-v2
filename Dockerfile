FROM python:3.11-slim

WORKDIR /app/backend

ENV PYTHONPATH=/app/backend
ENV ENV=development

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
