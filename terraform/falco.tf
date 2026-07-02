# ── Falco Runtime Security ─────────────────────────────────────────────────────
# Falcosidekick이 Falco 보안 이벤트를 기존 pinned-gke-alerts Pub/Sub 토픽으로 전송

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
