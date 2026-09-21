# NoteReel video engine

The GPU half of NoteReel. Runs on **Nebius AI Cloud** (Serverless Endpoint for single takes, Serverless Jobs for
batches) and serves two operations over HTTP:

| Endpoint | What it does | Model |
|---|---|---|
| `POST /keyframe` | Composes a shot's first frame from the locked reference photos, so the real product stays exact | [Qwen-Image-Edit-2509](https://huggingface.co/Qwen/Qwen-Image-Edit-2509) (Apache 2.0) |
| `POST /take` | Animates that frame into a ≤5 s vertical clip **with synchronized audio** | [LTX-2.5](https://huggingface.co/Lightricks/LTX-2.5-Diffusers) (LTX-2 Community License — free under $10M revenue) |
| `GET /health` | Liveness + which models are loaded | — |

Both model ids are environment variables (`KEYFRAME_MODEL`, `VIDEO_MODEL`), so any Hugging Face model with a
diffusers pipeline can be swapped in — e.g. `Wan-AI/Wan2.2-TI2V-5B-Diffusers` (Apache 2.0) or
`nvidia/Cosmos-Predict2.5-2B` (NVIDIA Open Model License) — without touching the app.

## Build

The image is ~10 GB, so it's built in CI, not on a laptop: `.github/workflows/video-engine.yml` builds it on every
push that touches this folder and pushes to `ghcr.io/<owner>/notereel-video-engine:main`.

Local build (needs Docker + patience): `docker build -t notereel-video-engine .`

## Deploy

```bash
IMAGE=ghcr.io/<owner>/notereel-video-engine:main ./deploy.sh
```

Then put the printed values in `app/.env`:

```
ENGINE_URL=https://<endpoint>.nebius.cloud
ENGINE_TOKEN=<token>
```

The endpoint downloads ~100 GB of weights on first start (a few minutes). Mount a volume at `/models` to keep them
between restarts. Stop the endpoint when you're not using it — a stopped endpoint isn't billed.

## Costs

H100 on-demand is about $2–3/hour. Current estimates used by the app's approval gate
(`app/src/lib/cost.ts`): ~40 GPU-seconds per keyframe, ~60 per take. Calibrate them from the `gpu_seconds`
each response reports.

## Requirements before this can run

Nebius **AI Cloud** must be active for your tenant. `nebius iam project list --parent-id <tenant>` must show
projects that are **not** `SUSPENDED`; otherwise job/endpoint creation fails with `PermissionDenied`.
Token Factory credits are separate and do **not** pay for AI Cloud GPUs.
