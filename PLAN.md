# NoteReel — Pivot Plan (Sep 19 → Oct 30, 2026)

## Why pivot
Today NVIDIA/Nebius only *plan* the ad (Nemotron prompts) and a third party (fal.ai) makes every pixel, so judges
can read it as "a wrapper around fal". The fix is not a new product — it's making the **whole studio run on
NVIDIA models on Nebius**, and copying the professional workflow that makes AI commercials look good.

## The product in one line
**An AI commercial studio: Nemotron directs, NVIDIA/open video models on Nebius GPUs shoot the takes, you approve
and cut the best seconds.**

## What makes pro AI ads good (and what we'll build for each)
| Pro technique | NoteReel feature | Runs on |
|---|---|---|
| Lock assets (product sheet, character, location) and reuse them as references | **Asset library**: upload real product photos, lock them, every shot references them | Nebius Blob/DB + Nemotron |
| One connected shot list with a style prefix and named prompts | **Shot-list engine**: style prefix + `1A/1B/2A…` prompts, continuity (match cuts, which asset in which shot), move-by-move motion | **Nemotron 3 Ultra** (Token Factory) |
| Edit like an editor: "edit 1A, only that" | **Director chat**: edits only the named prompt, re-applies the prefix | **Nemotron 3 Super** |
| Many cheap test takes, few expensive finals | **Takes**: N draft takes per shot in parallel; premium final only for approved shots | **Nebius Serverless Jobs** (GPU) + open video model; optional fal premium |
| Pick keeper seconds | **Take reviewer + keeper editor**: vision model describes, Nemotron ranks and suggests in/out points; you trim | Gemma (eyes) + **Nemotron** (judgment) |
| Cut to music | **Render** with music + captions, three aspect ratios | **Nebius Serverless Job** (CPU) |

Every paid step shows an estimated cost and needs an explicit **Approve** tap.

## Video model on Nebius — research summary
| Model | License | Output | Speed / VRAM | Fit for ads |
|---|---|---|---|---|
| **NVIDIA Cosmos-Predict2.5-2B** | NVIDIA Open Model License (commercial OK) | 720p, 16 fps, 5 s; text/image/video→video | ~229 s per clip on H100, ~33 GB VRAM | Built for robotics/physical AI; ad quality **unknown — must test**. NIM container exists. |
| **NVIDIA Cosmos3-Generator** | NVIDIA Open Model License | text/image→video (NIM) | Hopper+ GPU | Newer general generator; **check quality + availability** |
| **Wan 2.2 TI2V-5B** | Apache 2.0 | 720p, 24 fps, 5 s; text/image→video | runs on 24 GB; minutes per clip | Good open quality, cheap GPU (L40S) |
| **Wan 2.2 I2V-A14B** | Apache 2.0 | 720p | ~80 GB (H100) | Best open quality, slower |
| Seedance 2.0 (fal, premium) | commercial API | up to 4K | ~$0.25–0.30/s | Best quality; use only for approved finals |

Nebius GPU prices (published): H100 ≈ $2–3/hr, L40S from ≈ $0.74–0.90/hr.
Rough draft-take cost on Nebius: 4 min on H100 ≈ **$0.15–0.20 per 5 s clip** (vs ≈ $1.25–1.50 for Seedance 2.0).
So the economics match the pro workflow: explore with many cheap Nebius takes, spend premium money only on keepers.

**Plan:** one GPU container that serves Cosmos-Predict2.5 and Wan 2.2 TI2V-5B behind the same `/generate` API,
deployed as a Nebius Serverless **Endpoint** (interactive single takes) and run as Serverless **Jobs** (batches of
takes). Pick the default after a side-by-side test (needs your approval — costs GPU time).

## Architecture after the pivot
```
app/ (Vercel)            Next.js PWA + API + durable workflow
  ├─ Token Factory       Nemotron Ultra (shot list) · Super (director chat, copy, take ranking) · Gemma (vision)
  ├─ Nebius Endpoint     video-gen container (Cosmos / Wan) — single takes on demand
  ├─ Nebius Jobs         video-gen batches (N takes per shot) · ffmpeg render
  ├─ fal.ai (optional)   premium final takes (Seedance 2.0) — only after approval
  └─ Tavily              trend / occasion research
video-gen/               NEW: GPU container (FastAPI + diffusers/Cosmos), uploads clips to Blob
render-job/              existing ffmpeg renderer (extended: keeper in/out points, music)
```

## What changes in the current code
- **Keep:** app shell & iOS UI, DB, workflow runner, Nemotron client, render job, device identity, brand kit.
- **New data:** `assets` (locked references), `shotlist` (style prefix + named prompts), `takes` (per shot, with
  status, cost, review, keeper in/out).
- **Replace:** the one-shot "Make Reel" pipeline → staged flow: Brief → Assets → Shot list → Draft takes → Finals →
  Edit → Render, with an approval gate before every paid step.
- **New:** `video-gen/` container; `lib/media/nebius-video.ts` provider; director-chat API; takes gallery + keeper
  trimmer UI.

## Schedule
| Week | Dates | Deliverable | Paid generation? |
|---|---|---|---|
| 1 | Sep 19–25 | Shot-list engine (style prefix, named prompts, continuity), director chat, asset library with photo upload, approval-gate UI with cost estimates | No (mock media; Nemotron text only) |
| 2 | Sep 26–Oct 2 | `video-gen` container; deploy to Nebius Serverless Endpoint; side-by-side test Cosmos vs Wan on 2–3 prompts | **Yes — ask first** (GPU minutes) |
| 3 | Oct 3–9 | Takes system: batch takes via Serverless Jobs, take reviewer (Gemma + Nemotron), takes gallery, optional premium finals | Small tests — ask first |
| 4 | Oct 10–16 | Keeper editor (in/out points), music + captions render on Nebius Job, Tavily research in the brief | Small tests — ask first |
| 5 | Oct 17–23 | Deploy (Vercel + Nebius), Nebius service-account auth, one real client commercial as the case study, visual polish from BRAND.md | Client budget |
| 6 | Oct 24–29 | Demo video (<3 min), README (Nemotron / Token Factory / Nebius usage), feedback section, submit **by Oct 29** | — |

## Risks
- **Open-model quality** may not reach Seedance level → position Nebius takes as fast/cheap exploration and keep the
  premium finals path; the Nemotron shot-list engine is the core value either way.
- **GPU availability/credits** on Nebius → check Builder Program credits before week 2; use preemptible VMs for jobs.
- **Cold starts** of a GPU endpoint (large weights) → keep weights on a mounted volume; batch takes as Jobs.
- **Scope** → week 1 is fully testable without spending on media.

## Open decisions for you
1. OK to spend GPU time in week 2 for the Cosmos vs Wan test (estimate before running)?
2. How many Nebius credits do you have (Builder Program)?
3. Keep fal/Seedance as the optional premium tier, or go Nebius-only?

Sources: Nebius Serverless endpoints docs (docs.nebius.com/serverless/endpoints), Nebius prices (nebius.com/prices),
Cosmos-Predict2.5-2B model card (huggingface.co/nvidia/Cosmos-Predict2.5-2B), Cosmos NIM support matrix
(docs.nvidia.com/nim/cosmos/latest/support-matrix.html), Wan 2.2 (github.com/Wan-Video/Wan2.2).
