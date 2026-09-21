"""HTTP API for the video engine (FastAPI). Deployed as a Nebius Serverless Endpoint.

POST /keyframe  {prompt, references: [url|data-url], width, height, seed}        → {image: data-url}
POST /take      {prompt, negative_prompt?, first_frame?: url|data-url, width, height, seconds, seed} → video/mp4
GET  /health

Auth: Nebius endpoint token auth at the gateway; ENGINE_TOKEN adds an app-level bearer check as well.
"""

from __future__ import annotations

import base64
import io
import os
import time

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from PIL import Image
from pydantic import BaseModel, Field

import engine

app = FastAPI(title="NoteReel video engine")

DEFAULT_NEGATIVE = "worst quality, inconsistent motion, blurry, jittery, distorted, deformed hands, text, watermark"


def auth(authorization: str | None = Header(default=None)):
    token = os.environ.get("ENGINE_TOKEN")
    if token and authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="bad token")


def load_image(src: str) -> Image.Image:
    if src.startswith("data:"):
        data = base64.b64decode(src.split(",", 1)[1])
    else:
        r = httpx.get(src, timeout=60, follow_redirects=True)
        r.raise_for_status()
        data = r.content
    return Image.open(io.BytesIO(data)).convert("RGB")


class KeyframeRequest(BaseModel):
    prompt: str
    references: list[str] = Field(min_length=1, max_length=3)
    width: int = 544
    height: int = 960
    seed: int = 0


class TakeRequest(BaseModel):
    prompt: str
    negative_prompt: str = DEFAULT_NEGATIVE
    first_frame: str | None = None
    width: int = 544
    height: int = 960
    seconds: float = Field(default=4, ge=1, le=5.1)
    seed: int = 0


@app.get("/health")
def health():
    return {"ok": True, "video_model": engine.VIDEO_MODEL, "keyframe_model": engine.KEYFRAME_MODEL, "loaded": list(engine._pipes)}


@app.post("/keyframe", dependencies=[Depends(auth)])
async def keyframe(req: KeyframeRequest):
    refs = [load_image(r) for r in req.references]
    started = time.time()
    img = await run_in_threadpool(engine.keyframe, refs, req.prompt, req.width, req.height, req.seed)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return {
        "image": "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(),
        "gpu_seconds": round(time.time() - started, 1),
    }


@app.post("/take", dependencies=[Depends(auth)])
async def take(req: TakeRequest):
    first = load_image(req.first_frame) if req.first_frame else None
    started = time.time()
    mp4 = await run_in_threadpool(
        engine.take, req.prompt, req.negative_prompt, req.width, req.height, req.seconds, req.seed, first
    )
    return Response(content=mp4, media_type="video/mp4", headers={"x-gpu-seconds": f"{time.time() - started:.1f}"})
