#!/bin/bash
# GitHub Actions용 서비스 어카운트 키 생성
# gcp-setup.sh 실행 후 사용
set -e

export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

PROJECT_ID="pinned-4cf6c"
SA_EMAIL="pinned-sa@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="pinned-sa-key.json"

# CI/CD 추가 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" --quiet

# 키 생성
gcloud iam service-accounts keys create $KEY_FILE \
  --iam-account=$SA_EMAIL

echo ""
echo "✅ 키 생성 완료: $KEY_FILE"
echo ""
echo "GitHub 저장소 → Settings → Secrets and variables → Actions에서"
echo "아래 이름으로 파일 내용 전체를 복사해서 등록하세요:"
echo ""
echo "  Secret 이름: GCP_SA_KEY"
echo "  값: $(cat $KEY_FILE)"
echo ""
echo "⚠️  키 파일은 등록 후 즉시 삭제하세요:"
echo "  rm $KEY_FILE"
