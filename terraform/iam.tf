# 백엔드 파드가 사용할 GCP 서비스 계정
resource "google_service_account" "backend" {
  account_id   = "pinned-backend"
  display_name = "Pinned Backend"
  description  = "GKE 백엔드 파드용 서비스 계정 (Workload Identity)"
}

# 백엔드 SA에 사진 버킷 읽기/쓰기 권한 부여
resource "google_storage_bucket_iam_member" "backend_photos" {
  bucket = google_storage_bucket.photos.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend.email}"
}

# Workload Identity 바인딩
# K8s 서비스 계정 → GCP 서비스 계정으로 권한 위임
# 파드에 JSON 키 없이 GCP API 사용 가능
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${var.k8s_service_account}]"

  # Workload Identity Pool은 클러스터 생성 후 잠시 뒤 활성화됨
  depends_on = [google_container_cluster.primary]
}
