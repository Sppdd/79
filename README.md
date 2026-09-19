# NoteReel

**Type quick notes. Get a Reel that sells.**
NoteReel is an iOS-style web app for small businesses. You write a few rough notes
("cinnamon oat latte, $4.50, this weekend only") and an AI creative team turns them into a
short vertical video ad: hook, shots, captions, voiceover, a Reel caption, and three Meta ad copy variants.

Track: **Best Apps and Agents** (Nebius x NVIDIA Global AI Hackathon)

## How NVIDIA Nemotron and Nebius are used

The media models (images, video, voice) are the camera crew. **Nemotron is the creative director and the quality checker.**

| Step | What happens | Model / service |
|---|---|---|
| Research | Brand context and niche trends | Tavily |
| Brief | Messy notes → structured marketing brief | **Nemotron 3 Super** on Nebius Token Factory |
| Direct | Hook, 4–8 shot storyboard, generation prompts, captions, voiceover script | **Nemotron 3 Ultra** on Token Factory |
| Shoot | Each shot routed to the best model for its style (product / cinematic / lifestyle) | fal.ai (FLUX, Kling, …) |
| QA | A vision model (Gemma 3 on Token Factory) describes each frame; **Nemotron 3 Super** judges it against the shot and brand, and writes a fixed prompt for failing shots, which are regenerated | Token Factory |
| Copy | Reel caption, hashtags, 3 Meta ad variants for A/B testing | **Nemotron 3 Super** |
| Render | ffmpeg assembles 9:16, 1:1 and 4:5 MP4s with captions + voiceover | **Nebius Serverless Jobs** |

Why this split: Ultra is used once per Reel for the one decision that needs deep reasoning; the frequent calls go to
smaller, faster models, so the app stays responsive and credits go further. The QA loop means expensive video
generation is only redone for the shots that actually failed.

## Architecture

```
app/          Next.js PWA (UI + API + durable workflow)      → Vercel
render-job/   ffmpeg render container                         → Nebius Serverless Jobs
```

- `app/src/workflows/make-reel.ts` — the whole pipeline, one readable file of durable steps (Vercel Workflow).
- `app/src/lib/ai/nemotron.ts` — the only file that talks to Token Factory.
- `app/src/lib/ai/agents/*` — one file per agent role (brief, director, qa, adcopy), each with a Zod schema.
- `app/src/lib/media/*` — the swappable media layer (`fal` or `mock`).
- `app/src/lib/render/nebius.ts` — the only file that talks to Nebius AI Cloud.
- `app/src/db/*` — Drizzle; Neon Postgres in production, embedded PGlite locally.

## Run locally

```bash
cd app
cp .env.example .env.local   # every key is optional; without keys the app runs in demo mode
npm install
npm run dev                  # http://localhost:3000
```

| Keys you set | What you get |
|---|---|
| none | Full UI with sample plans and placeholder images |
| `NEBIUS_API_KEY` | Real Nemotron brief, direction, QA and ad copy |
| `+ FAL_KEY` | Real generated images, video clips, voiceover and music |
| `+ Blob + NEBIUS_*` | Rendered MP4 files from a Nebius Serverless Job |

`npm run models` lists the NVIDIA models your Token Factory key can use.

**Render MP4s on your machine:** `brew install ffmpeg`, set `RENDER_MODE=local`, then press **Render video** in a
Reel. Files land in `app/public/renders/<id>/`. Production uses the Nebius Serverless Job instead (same script).

## Costs

`MEDIA_QUALITY` picks the media tier. Nemotron calls are about $0.03 per Reel either way.

| Tier | Models | Approx. per Reel |
|---|---|---|
| `draft` (default) | FLUX schnell + Seedance Lite 480p, 1 video shot | $0.10–0.20 |
| `pro` | FLUX Pro 1.1 + Kling 2.1, up to 3 video shots | $1.00–1.40 |

## Deploy

1. **App → Vercel:** import the repo with root directory `app`. Add Neon Postgres and Blob from the Vercel Marketplace,
   then add the remaining variables from `.env.example`. Every push to `main` deploys.
2. **Renderer → Nebius:** build and push the container, then set `NEBIUS_JOB_IMAGE` to its path:
   ```bash
   cd render-job
   docker build --platform linux/amd64 -t cr.<region>.nebius.cloud/<registry-id>/reel-render:latest .
   docker push cr.<region>.nebius.cloud/<registry-id>/reel-render:latest
   ```
   The app starts one job per Reel through the Nebius REST API (`POST /ai/v1/jobs`). The job uploads the MP4s to
   Blob and calls `/api/render/callback` (HMAC-signed), which resumes the workflow.

Test the renderer locally: `docker run --rm -e BLOB_READ_WRITE_TOKEN=… reel-render ./manifest.json`

## License

MIT
