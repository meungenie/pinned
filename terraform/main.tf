terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  backend "gcs" {
    bucket = "pinned-tf-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 필요한 GCP API 활성화
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com", # Terraform IAM/API 관리에 필수 (첫 실행 전 수동 활성화)
    "container.googleapis.com",            # GKE
    "storage.googleapis.com",              # GCS
    "iam.googleapis.com",                  # IAM
    "artifactregistry.googleapis.com",     # Docker 이미지 저장소
    "compute.googleapis.com",              # GKE 노드 및 VPC/Private IP
    "servicenetworking.googleapis.com",    # Cloud SQL Private IP (VPC Peering)
    "secretmanager.googleapis.com",        # DB 비밀번호 및 Anthropic API Key 보관
    "pubsub.googleapis.com",              # Self-Healing 알림 채널
    "monitoring.googleapis.com",           # Cloud Monitoring Alert
    "logging.googleapis.com",             # Cloud Logging (로그 조회)
    "cloudfunctions.googleapis.com",      # Self-Healer Cloud Function
    "run.googleapis.com",                 # Cloud Function v2 런타임
    "cloudbuild.googleapis.com",          # Cloud Function 빌드
  ])

  service            = each.value
  disable_on_destroy = false
}
