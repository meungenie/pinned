#!/usr/bin/env bash
set -euo pipefail

PROJECT="project-9c52df7f-9c59-4739-9b4"
REGION="asia-northeast3"
CLUSTER="pinned-cluster"
POOL="default-pool"

echo "▶ GKE 노드 내리는 중..."
gcloud container clusters resize "$CLUSTER" \
  --node-pool "$POOL" \
  --num-nodes 0 \
  --region "$REGION" \
  --project "$PROJECT" \
  --quiet

echo "✅ 완료 — 노드 0개로 축소됐습니다. (CloudSQL·컨트롤 플레인은 유지)"
