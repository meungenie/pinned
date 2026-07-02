# ── Falco Runtime Security ─────────────────────────────────────────────────────
# Falcosidekick → pinned-gke-alerts Pub/Sub 토픽으로 런타임 보안 이벤트 전송
# Self-Healer Cloud Function이 동일 토픽을 구독해 자동 대응

resource "google_service_account" "falcosidekick" {
  account_id   = "pinned-falcosidekick"
  display_name = "Falcosidekick Pub/Sub Publisher"
  description  = "Falcosidekick → pinned-gke-alerts Pub/Sub 전송 전용"
}

resource "google_pubsub_topic_iam_member" "falcosidekick_publish" {
  topic  = google_pubsub_topic.gke_alerts.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.falcosidekick.email}"
}

# Workload Identity: falco 네임스페이스 falcosidekick K8s SA → GCP SA
resource "google_service_account_iam_member" "falcosidekick_wi" {
  service_account_id = google_service_account.falcosidekick.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[falco/falcosidekick]"
}
