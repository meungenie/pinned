#!/bin/bash
# GCP 인프라 초기 셋업 스크립트
# 사용법: bash scripts/gcp-setup.sh
set -e

export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

PROJECT_ID="pinned-4cf6c"
REGION="asia-northeast3"       # 서울
CLUSTER_NAME="pinned-cluster"
DB_INSTANCE="pinned-db"
DB_NAME="pinned_db"
DB_USER="pinned_user"
ARTIFACT_REPO="pinned"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " pinned GCP 인프라 셋업"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 프로젝트 설정
echo "[1/7] 프로젝트 설정..."
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# 2. 필요한 API 활성화
echo "[2/7] API 활성화..."
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  servicenetworking.googleapis.com \
  secretmanager.googleapis.com

# 3. Artifact Registry 저장소 생성 (Docker 이미지)
echo "[3/7] Artifact Registry 생성..."
gcloud artifacts repositories create $ARTIFACT_REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="pinned 앱 Docker 이미지" \
  --quiet || echo "이미 존재함, 스킵"

# 4. GKE Autopilot 클러스터 생성
echo "[4/7] GKE Autopilot 클러스터 생성 (약 3-5분 소요)..."
gcloud container clusters create-auto $CLUSTER_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --quiet || echo "이미 존재함, 스킵"

# 5. Cloud SQL PostgreSQL 인스턴스 생성
echo "[5/7] Cloud SQL 인스턴스 생성 (약 5분 소요)..."
gcloud sql instances create $DB_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-auto-increase \
  --quiet || echo "이미 존재함, 스킵"

# DB와 유저 생성
echo "    DB 및 유저 생성..."
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE --quiet || echo "이미 존재함"
DB_PASS=$(openssl rand -base64 16)
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE \
  --password=$DB_PASS \
  --quiet || echo "이미 존재함"
echo "    ⚠️  DB 비밀번호 저장: $DB_PASS"
echo "    k8s/backend/secret.yaml의 DB_PASSWORD를 이 값으로 교체하세요"

# 6. 서비스 어카운트 생성 (Pod용 IAM)
echo "[6/7] 서비스 어카운트 설정..."
SA_NAME="pinned-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
  --display-name="pinned app service account" \
  --quiet || echo "이미 존재함"

# Cloud SQL 접근 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client" --quiet

# Storage 접근 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin" --quiet

# GKE Workload Identity 연결
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[pinned/pinned-sa]" --quiet

# 7. 정적 IP 예약
echo "[7/7] 외부 IP 예약..."
gcloud compute addresses create pinned-ip --global --quiet || echo "이미 존재함"
STATIC_IP=$(gcloud compute addresses describe pinned-ip --global --format="value(address)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ 셋업 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 다음 단계:"
echo ""
echo "1. k8s/backend/deployment.yaml 에서 아래 값 교체:"
echo "   - REGION  →  $REGION"
echo "   - PROJECT_ID  →  $PROJECT_ID"
echo "   (인스턴스 연결 이름: ${PROJECT_ID}:${REGION}:${DB_INSTANCE})"
echo ""
echo "2. k8s/backend/secret.yaml 에서 DB_PASSWORD 교체"
echo "   (위에서 출력된 비밀번호 사용)"
echo ""
echo "3. 고정 IP: $STATIC_IP"
echo "   → DNS A 레코드를 이 IP로 설정하세요"
echo ""
echo "4. kubectl 컨텍스트 설정:"
echo "   gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION"
echo ""
echo "5. GitHub Actions Secret 등록 (저장소 Settings → Secrets):"
echo "   GCP_SA_KEY = 서비스 어카운트 JSON 키"
echo ""
INSTANCE_CONN=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)" 2>/dev/null || echo "${PROJECT_ID}:${REGION}:${DB_INSTANCE}")
echo "   Cloud SQL 연결 이름: $INSTANCE_CONN"
