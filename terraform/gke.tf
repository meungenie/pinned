# GKE Autopilot 클러스터
# Autopilot = 노드 관리 불필요, 실무에서 많이 사용하는 managed 방식
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  enable_autopilot = true

  # Workload Identity 활성화 (pod가 GCP 서비스 계정 권한을 키 파일 없이 사용)
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  depends_on = [google_project_service.apis["container.googleapis.com"]]
}

# Docker 이미지 저장소 (Artifact Registry)
resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = "pinned-app"
  format        = "DOCKER"
  description   = "pinned 앱 Docker 이미지 저장소"

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}
