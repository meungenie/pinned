output "photos_bucket_name" {
  description = "사진 저장 버킷 이름 (.env의 GCS_BUCKET_NAME에 사용)"
  value       = google_storage_bucket.photos.name
}

output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}

output "gke_connect_command" {
  description = "클러스터 연결 명령어"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --region ${var.region} --project ${var.project_id}"
}

output "artifact_registry_url" {
  description = "Docker 이미지 push URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}

output "backend_sa_email" {
  description = "Workload Identity에 사용할 GCP 서비스 계정 이메일"
  value       = google_service_account.backend.email
}

output "github_actions_sa_email" {
  description = "GitHub Actions CI/CD 서비스 계정 이메일"
  value       = google_service_account.github_actions.email
}

output "workload_identity_provider" {
  description = "GitHub Actions 워크플로우의 workload_identity_provider 값"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "waf_policy_name" {
  description = "Cloud Armor WAF 보안 정책 이름 (BackendConfig와 일치해야 함)"
  value       = google_compute_security_policy.waf.name
}

output "waf_policy_selflink" {
  description = "Cloud Armor WAF 보안 정책 Self-Link (GCP 콘솔 직접 확인용)"
  value       = google_compute_security_policy.waf.self_link
}
