variable "project_id" {
  description = "GCP 프로젝트 ID"
  default     = "project-9c52df7f-9c59-4739-9b4"
}

variable "region" {
  description = "GCP 리전 (서울)"
  default     = "asia-northeast3"
}

variable "photos_bucket_name" {
  description = "사진 저장용 GCS 버킷 이름 (전 세계 고유)"
  default     = "pinned-photos"
}

variable "cluster_name" {
  description = "GKE 클러스터 이름"
  default     = "pinned-cluster"
}

variable "k8s_namespace" {
  description = "Kubernetes 네임스페이스"
  default     = "default"
}

variable "k8s_service_account" {
  description = "Workload Identity에 연결할 K8s 서비스 계정 이름"
  default     = "pinned-backend"
}

variable "github_repo" {
  description = "GitHub 레포 (owner/repo 형식)"
  default     = "meungenie/pinned"
}
