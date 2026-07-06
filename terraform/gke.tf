# GKE Standard 클러스터
# Falco 등 DaemonSet 기반 보안 에이전트 실행을 위해 Standard 선택
# (Autopilot은 privileged 컨테이너 + hostPath 차단 → Falco 동작 불가)
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  # 기본 노드풀 제거 후 별도 노드풀에서 관리
  remove_default_node_pool = true
  initial_node_count       = 1

  # Workload Identity 활성화
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # 이미지 취약점 스캔 + 런타임 위협 탐지 (Falco 보완)
  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_BASIC"
  }

  depends_on = [google_project_service.apis["container.googleapis.com"]]
}

resource "google_container_node_pool" "primary_nodes" {
  name     = "default-pool"
  location = var.region
  cluster  = google_container_cluster.primary.name

  node_count = 2

  node_config {
    machine_type = "e2-medium"

    # COS_CONTAINERD: Falco modern_ebpf 드라이버 지원
    image_type = "COS_CONTAINERD"

    # Workload Identity 활성화
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Docker 이미지 저장소 (Artifact Registry)
resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = "pinned-app"
  format        = "DOCKER"
  description   = "pinned 앱 Docker 이미지 저장소"

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}
