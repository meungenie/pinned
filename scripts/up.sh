#!/usr/bin/env bash
set -euo pipefail

PROJECT="project-9c52df7f-9c59-4739-9b4"
REGION="asia-northeast3"
CLUSTER="pinned-cluster"
POOL="default-pool"
NODES=2

echo "▶ GKE 노드 올리는 중..."
gcloud container clusters resize "$CLUSTER" \
  --node-pool "$POOL" \
  --num-nodes "$NODES" \
  --region "$REGION" \
  --project "$PROJECT" \
  --quiet

echo "⏳ 노드 Ready 대기 중..."
kubectl wait nodes --all --for=condition=Ready --timeout=180s

echo "✅ 완료 — 노드 ${NODES}개 준비됐습니다."
