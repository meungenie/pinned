# ── Pub/Sub ───────────────────────────────────────────────────────────────────

resource "google_pubsub_topic" "gke_alerts" {
  name       = "pinned-gke-alerts"
  depends_on = [google_project_service.apis["pubsub.googleapis.com"]]
}

# Monitoring API 활성화 후 서비스 계정 생성까지 대기
resource "time_sleep" "wait_for_monitoring_sa" {
  create_duration = "30s"
  depends_on      = [google_project_service.apis["monitoring.googleapis.com"]]
}

# Cloud Monitoring이 Pub/Sub에 publish할 수 있도록 권한 부여
resource "google_pubsub_topic_iam_member" "monitoring_publish" {
  topic  = google_pubsub_topic.gke_alerts.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-monitoring-notification.iam.gserviceaccount.com"
  depends_on = [time_sleep.wait_for_monitoring_sa]
}

data "google_project" "project" {}

# ── 알림 채널 (Alert → Pub/Sub) ───────────────────────────────────────────────

resource "google_monitoring_notification_channel" "pubsub" {
  display_name = "GKE Alert → Pub/Sub (Self-Healer)"
  type         = "pubsub"
  labels = {
    topic = google_pubsub_topic.gke_alerts.id
  }
  depends_on = [google_project_service.apis["monitoring.googleapis.com"]]
}

# ── Alert Policies ─────────────────────────────────────────────────────────────

# Pod 재시작 과다 (CrashLoopBackOff 조기 감지)
resource "google_monitoring_alert_policy" "pod_restarts" {
  display_name = "[Pinned] GKE Pod 재시작 과다"
  combiner     = "OR"

  conditions {
    display_name = "컨테이너 재시작 횟수 > 3 (1분)"
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"${var.k8s_namespace}\" AND metric.type=\"kubernetes.io/container/restart_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      duration        = "60s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_DELTA"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pubsub.name]
  alert_strategy {
    auto_close = "604800s"
  }
  depends_on = [google_project_service.apis["monitoring.googleapis.com"]]
}

# 메모리 사용률 > 85% (OOMKilled 예방)
resource "google_monitoring_alert_policy" "high_memory" {
  display_name = "[Pinned] GKE 메모리 사용률 > 85%"
  combiner     = "OR"

  conditions {
    display_name = "컨테이너 메모리 사용률 > 85%"
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"${var.k8s_namespace}\" AND metric.type=\"kubernetes.io/container/memory/used_bytes\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "120s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.labels.container_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pubsub.name]
  alert_strategy {
    auto_close = "604800s"
  }
  depends_on = [google_project_service.apis["monitoring.googleapis.com"]]
}

# 실행 중인 Pod 0개 (서비스 완전 다운)
resource "google_monitoring_alert_policy" "no_pods_running" {
  display_name = "[Pinned] GKE 실행 중 Pod 없음"
  combiner     = "OR"

  conditions {
    display_name = "Ready Pod 수 = 0"
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"${var.k8s_namespace}\" AND metric.type=\"kubernetes.io/container/uptime\""
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "60s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_COUNT"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pubsub.name]
  alert_strategy {
    auto_close = "604800s"
  }
  depends_on = [google_project_service.apis["monitoring.googleapis.com"]]
}

# ── Secret Manager (Anthropic API Key) ────────────────────────────────────────

resource "google_secret_manager_secret" "anthropic_key" {
  secret_id = "anthropic-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

# ── Cloud Function 소스 코드 버킷 ──────────────────────────────────────────────

resource "google_storage_bucket" "function_source" {
  name                        = "${var.project_id}-function-source"
  location                    = var.region
  uniform_bucket_level_access = true

  # 소스 버킷도 공개 접근을 항상 차단 (보안 강화)
  public_access_prevention = "enforced"

  force_destroy = true
  depends_on    = [google_project_service.apis["storage.googleapis.com"]]
}

data "archive_file" "self_healing" {
  type        = "zip"
  source_dir  = "${path.module}/../scripts/self_healing"
  output_path = "${path.module}/../scripts/self_healing.zip"
}

resource "google_storage_bucket_object" "self_healing_source" {
  name   = "self_healing_${data.archive_file.self_healing.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.self_healing.output_path
}

# ── Self-Healer 서비스 계정 ────────────────────────────────────────────────────

resource "google_service_account" "self_healer" {
  account_id   = "pinned-self-healer"
  display_name = "Pinned Self-Healer (Cloud Function)"
  description  = "AI Self-Healing Cloud Function 전용 서비스 계정"
}

# 최소 권한 커스텀 역할: 자가복구에 필요한 Pod/Deployment 조회·재시작 권한만 부여
# (기존 roles/container.developer는 워크로드 변경 권한이 과도하여 축소)
resource "google_project_iam_custom_role" "self_healer" {
  role_id     = "pinnedSelfHealer"
  title       = "Pinned Self-Healer Minimal"
  description = "Self-Healing Cloud Function이 필요로 하는 최소 GKE 권한"
  permissions = [
    "container.clusters.get",
    "container.clusters.getCredentials",
    "container.pods.get",
    "container.pods.list",
    "container.pods.delete",
    "container.deployments.get",
    "container.deployments.list",
    "container.deployments.update",
    "container.replicaSets.get",
    "container.replicaSets.list",
    "container.events.get",
    "container.events.list",
  ]
}

resource "google_project_iam_member" "self_healer_gke" {
  project = var.project_id
  role    = google_project_iam_custom_role.self_healer.id
  member  = "serviceAccount:${google_service_account.self_healer.email}"
}

resource "google_project_iam_member" "self_healer_logging" {
  project = var.project_id
  role    = "roles/logging.viewer"
  member  = "serviceAccount:${google_service_account.self_healer.email}"
}

# anthropic_key 시크릿은 self_healer SA만 접근 가능 (최소 권한)
resource "google_secret_manager_secret_iam_member" "self_healer_secret" {
  secret_id = google_secret_manager_secret.anthropic_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.self_healer.email}"
}

# ── Cloud Build 서비스 계정 권한 ──────────────────────────────────────────────

resource "google_project_iam_member" "cloudbuild_builder" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

# IAM 전파 대기 (GCP IAM 변경은 전파까지 최대 60초 소요)
resource "time_sleep" "wait_for_cloudbuild_iam" {
  create_duration = "60s"
  depends_on = [
    google_project_iam_member.cloudbuild_builder,
    google_project_iam_member.cloudbuild_logging,
    google_project_iam_member.cloudbuild_registry,
  ]
}

# ── Cloud Function v2 ─────────────────────────────────────────────────────────

resource "google_cloudfunctions2_function" "self_healer" {
  name     = "pinned-self-healer"
  location = var.region

  build_config {
    runtime     = "python312"
    entry_point = "self_heal"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.self_healing_source.name
      }
    }
  }

  service_config {
    min_instance_count    = 0
    max_instance_count    = 3
    timeout_seconds       = 300
    service_account_email = google_service_account.self_healer.email

    environment_variables = {
      PROJECT_ID     = var.project_id
      CLUSTER_NAME   = var.cluster_name
      CLUSTER_REGION = var.region
      K8S_NAMESPACE  = var.k8s_namespace
      SLACK_WEBHOOK  = var.slack_webhook_url
    }

    secret_environment_variables {
      key        = "ANTHROPIC_API_KEY"
      project_id = var.project_id
      secret     = google_secret_manager_secret.anthropic_key.secret_id
      version    = "latest"
    }
  }

  event_trigger {
    trigger_region        = var.region
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.gke_alerts.id
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.self_healer.email
  }

  depends_on = [
    google_project_service.apis["cloudfunctions.googleapis.com"],
    google_project_service.apis["run.googleapis.com"],
    google_storage_bucket_object.self_healing_source,
    time_sleep.wait_for_cloudbuild_iam,
  ]
}
