# 사진 저장 버킷
resource "google_storage_bucket" "photos" {
  name                        = var.photos_bucket_name
  location                    = var.region
  uniform_bucket_level_access = false

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

# 업로드된 사진을 누구나 읽을 수 있게 (공개 URL 접근)
resource "google_storage_bucket_iam_member" "photos_public_read" {
  bucket = google_storage_bucket.photos.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# 임시 테스트용: 누구나 파일 업로드 가능 (보안 취약)
resource "google_storage_bucket_iam_member" "photos_public_write" {
  bucket = google_storage_bucket.photos.name
  role   = "roles/storage.objectCreator"
  member = "allUsers"
}
