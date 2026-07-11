# GitHub Actions용 Workload Identity Federation
# GCP_SA_KEY JSON 파일 없이 GitHub Actions에서 GCP 인증
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "GitHub Actions CI/CD용 WIF Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC Provider"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  # 이 레포에서 오는 토큰만 허용
  attribute_condition = "assertion.repository == '${var.github_repo}'"
}

# CI/CD 전용 서비스 계정
resource "google_service_account" "github_actions" {
  account_id   = "pinned-github-actions"
  display_name = "GitHub Actions CI/CD"
  description  = "Terraform 실행 및 GKE 배포용"
}

# Terraform state 버킷 접근 권한
resource "google_storage_bucket_iam_member" "github_actions_state" {
  bucket = "pinned-tf-state"
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.github_actions.email}"
}

# GKE 배포 권한
resource "google_project_iam_member" "github_actions_gke" {
  project = var.project_id
  role    = "roles/container.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Artifact Registry 이미지 push 권한
resource "google_project_iam_member" "github_actions_ar" {
  project = var.project_id
  role    = "roles/artifactregistry.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Terraform이 IAM 관리할 수 있도록
resource "google_project_iam_member" "github_actions_iam" {
  project = var.project_id
  role    = "roles/iam.securityAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# GCS, SA 등 나머지 리소스 관리
resource "google_project_iam_member" "github_actions_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Secret Manager 읽기 권한 (backend-secret 생성 시 DB 비밀번호 조회)
# 최소 권한 원칙(PoLP) 적용: 프로젝트 전체(google_project_iam_member)가 아닌
# 실제로 필요한 개별 시크릿(pinned-db-password)에만 secretAccessor 바인딩.
# 인증은 Workload Identity Federation(OIDC) + 리포지토리 조건 제한을 사용하므로 정적 JSON 키 미사용.
# NOTE: CI/CD가 db_password 외 다른 시크릿(예: anthropic-api-key)에도 접근한다면
#       해당 시크릿에 대한 google_secret_manager_secret_iam_member를 추가로 정의해야 함.
resource "google_secret_manager_secret_iam_member" "github_actions_db_password" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.github_actions.email}"
}

# GitHub Actions → GCP SA 위임 바인딩
resource "google_service_account_iam_member" "github_actions_wif" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
