#!/usr/bin/env bash
# Deploy the NoteReel video engine to a Nebius Serverless Endpoint (H100).
#
# Prerequisites:
#   - Nebius CLI logged in:  ~/.nebius/bin/nebius profile create
#   - AI Cloud active (projects not SUSPENDED) — see README
#   - The image built and pushed (GitHub Actions builds it to GHCR on every push to main)
#
# Usage: IMAGE=ghcr.io/<owner>/notereel-video-engine:main ./deploy.sh
set -euo pipefail

NEBIUS="${NEBIUS:-$HOME/.nebius/bin/nebius}"
NAME="${NAME:-notereel-video-engine}"
IMAGE="${IMAGE:?set IMAGE=ghcr.io/<owner>/notereel-video-engine:main}"
PLATFORM="${PLATFORM:-gpu-h100-sxm}"
PRESET="${PRESET:-1gpu-16vcpu-200gb}"
DISK="${DISK:-500Gi}"                      # model weights are ~100 GB
TOKEN="${ENGINE_TOKEN:-$(openssl rand -hex 16)}"

echo "Deploying $NAME from $IMAGE on $PLATFORM/$PRESET"
"$NEBIUS" ai endpoint create \
  --name "$NAME" \
  --image "$IMAGE" \
  --container-port 8000 \
  --platform "$PLATFORM" \
  --preset "$PRESET" \
  --disk-size "$DISK" \
  --env "ENGINE_TOKEN=$TOKEN" \
  --env "HF_HOME=/models" \
  --auth token \
  --public

echo
echo "Add these to app/.env (and to Vercel later):"
echo "ENGINE_URL=<the https URL printed above>"
echo "ENGINE_TOKEN=$TOKEN"
echo
echo "Watch the first start (weights download, several minutes):"
echo "  $NEBIUS ai logs $NAME --follow"
echo "Stop billing when you're done for the day:"
echo "  $NEBIUS ai endpoint stop $NAME"
