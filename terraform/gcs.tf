# 사진 저장 버킷
resource "google_storage_bucket" "photos" {
  name                        = var.photos_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true

  # 개발 중에는 true로 두되, 프로덕션 전 false로 변경
  force_destroy = true

  lifecycle {
    prevent_destroy = false
  }

  cors {
    origin          = ["*"]
    method          = ["GET"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

# 업로드된 사진을 누구나 읽을 수 있게 (공개 URL 접근)
resource "google_storage_bucket_iam_member" "photos_public_read" {
  bucket = google_storage_bucket.photos.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
