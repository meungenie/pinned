resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_sql_database_instance" "postgres" {
  name             = "pinned-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  deletion_protection = true

  settings {
    tier = "db-f1-micro"

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    ip_configuration {
      # 공인 IP 비활성화 + Private IP 사용
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"

      # SSL/TLS 강제 (암호화된 연결만 허용)
      ssl_mode = "ENCRYPTED_ONLY"
    }
  }

  depends_on = [google_project_service.sqladmin]
}

resource "google_sql_database" "app" {
  name     = "pinned"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = "pinned_user"
  instance = google_sql_database_instance.postgres.name

  # 권장: var.db_password 평문 대신 Secret Manager 또는 IAM DB 인증 사용
  # (예: data.google_secret_manager_secret_version 으로 주입)
  password = var.db_password
}
