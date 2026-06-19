terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
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
    "compute.googleapis.com",              # GKE 노드용
  ])

  service            = each.value
  disable_on_destroy = false
}
