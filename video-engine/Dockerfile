# NoteReel video engine — runs on a Nebius Serverless Endpoint (H100).
FROM pytorch/pytorch:2.7.1-cuda12.8-cudnn9-runtime

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git && rm -rf /var/lib/apt/lists/*

WORKDIR /engine
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY engine.py server.py ./

# Weights download on first start; mount a Nebius volume at /models so restarts don't re-download.
ENV HF_HOME=/models HF_HUB_ENABLE_HF_TRANSFER=1 PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
