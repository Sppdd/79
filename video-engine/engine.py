"""NoteReel video engine: open models from Hugging Face, run on a Nebius GPU.

Two operations, mirroring how pro AI commercials are made:
  keyframe() — compose the first frame of a shot from locked reference photos (Qwen-Image-Edit, Apache 2.0)
  take()     — animate that frame (or generate from text) into a ≤5 s clip with sound (LTX-2.5, LTX-2 Community License)

Pipelines load lazily and are cached, so one warm container serves many takes.
Model ids are env-configurable to swap in other Hugging Face models without code changes.
"""

from __future__ import annotations

import inspect
import os
import tempfile
import threading

import torch
from PIL import Image

KEYFRAME_MODEL = os.environ.get("KEYFRAME_MODEL", "Qwen/Qwen-Image-Edit-2509")
VIDEO_MODEL = os.environ.get("VIDEO_MODEL", "Lightricks/LTX-2.5-Diffusers")
# Distilled LTX runs in ~8 denoising steps with no guidance — the fast "draft take" mode.
DISTILLED = os.environ.get("LTX_DISTILLED", "1") == "1"
FPS = 24

_lock = threading.Lock()  # one generation at a time per GPU
_pipes: dict[str, object] = {}


def _load(name: str):
    if name in _pipes:
        return _pipes[name]
    if name == "keyframe":
        from diffusers import QwenImageEditPlusPipeline

        pipe = QwenImageEditPlusPipeline.from_pretrained(KEYFRAME_MODEL, torch_dtype=torch.bfloat16)
    else:
        from diffusers import LTX2Pipeline

        pipe = LTX2Pipeline.from_pretrained(VIDEO_MODEL, torch_dtype=torch.bfloat16)
        if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
            pipe.vae.enable_tiling()
    # Both pipelines don't fit in 80 GB together; offload keeps only the active parts on the GPU.
    pipe.enable_model_cpu_offload()
    _pipes[name] = pipe
    return pipe


def _frames(seconds: float) -> int:
    """LTX needs 8k+1 frames; cap at ~5 s."""
    k = max(1, min(15, round(seconds * FPS / 8)))
    return k * 8 + 1


def keyframe(references: list[Image.Image], prompt: str, width: int, height: int, seed: int) -> Image.Image:
    """First frame of a shot that keeps the locked product/person/location looking exactly like the references."""
    with _lock:
        pipe = _load("keyframe")
        out = pipe(
            image=references[:3],
            prompt=prompt,
            negative_prompt=" ",
            true_cfg_scale=4.0,
            guidance_scale=1.0,
            num_inference_steps=int(os.environ.get("KEYFRAME_STEPS", "40")),
            generator=torch.Generator("cuda").manual_seed(seed),
        )
        img: Image.Image = out.images[0]
    return img.resize((width, height), Image.LANCZOS)


def take(
    prompt: str,
    negative_prompt: str,
    width: int,
    height: int,
    seconds: float,
    seed: int,
    first_frame: Image.Image | None = None,
) -> bytes:
    """One clip (MP4, H.264 + AAC) — image-to-video when a first frame is given, else text-to-video."""
    from diffusers.utils import encode_video

    with _lock:
        pipe = _load("video")
        kwargs: dict = dict(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_frames=_frames(seconds),
            frame_rate=float(FPS),
            generator=torch.Generator("cuda").manual_seed(seed),
            output_type="np",
            return_dict=False,
        )
        if DISTILLED:
            from diffusers.pipelines.ltx2.utils import DISTILLED_SIGMA_VALUES

            kwargs.update(sigmas=DISTILLED_SIGMA_VALUES, guidance_scale=1.0)
            if "audio_guidance_scale" in inspect.signature(pipe.__call__).parameters:
                kwargs["audio_guidance_scale"] = 1.0
        else:
            kwargs.update(num_inference_steps=30, guidance_scale=3.0)

        if first_frame is not None:
            if "image" in inspect.signature(pipe.__call__).parameters:
                kwargs["image"] = first_frame
            else:  # older diffusers split image-to-video into its own pipeline
                from diffusers import LTX2ImageToVideoPipeline

                pipe = _pipes.setdefault("video_i2v", LTX2ImageToVideoPipeline.from_pipe(pipe))
                kwargs["image"] = first_frame

        video, audio = pipe(**kwargs)

    with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
        encode_video(
            video[0],
            fps=FPS,
            output_path=tmp.name,
            audio=audio[0].float().cpu() if audio is not None else None,
            audio_sample_rate=pipe.vocoder.config.output_sampling_rate if audio is not None else None,
        )
        with open(tmp.name, "rb") as f:
            return f.read()
