# 사진 저장 버킷
resource "google_storage_bucket" "photos" {
  name     = var.photos_bucket_name
  location = var.region

  # 보안 모범사례: 균일 버킷 수준 접근 제어 활성화 (객체 ACL 비활성화)
  uniform_bucket_level_access = true

  # 조직/폴더 정책과 무관하게 공개 접근을 항상 차단
  public_access_prevention = "enforced"

  force_destroy = true

  lifecycle {
    prevent_destroy = false
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 7200
  }

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

# 보안 위험으로 인해 allUsers 공개 읽기/쓰기 IAM 멤버를 제거했습니다.
# - photos_public_read (allUsers + objectViewer): 제거
# - photos_public_write (allUsers + objectCreator): 제거 (무단 업로드/비용 폭증 위험)
#
# 업로드/다운로드는 다음 방식으로 처리하세요:
#   1) 백엔드 서비스 계정(google_service_account.backend)을 통한 접근
#   2) 클라이언트 직접 업로드/다운로드가 필요하면 서명된 URL(Signed URL) 발급
