resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

# Private IP(VPC Peering)용 예약 주소 범위
resource "google_compute_global_address" "private_ip_address" {
  name          = "pinned-postgres-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = "projects/${var.project_id}/global/networks/default"

  depends_on = [google_project_service.apis["compute.googleapis.com"]]
}

# Service Networking 연결 (Cloud SQL Private IP에 필요)
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = "projects/${var.project_id}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]

  depends_on = [google_project_service.apis["servicenetworking.googleapis.com"]]
}

# DB 비밀번호를 코드/tfstate 평문 노출 없이 랜덤 생성
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Secret Manager에 비밀번호 저장
resource "google_secret_manager_secret" "db_password" {
  secret_id = "pinned-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_sql_database_instance" "postgres" {
  name             = "pinned-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  deletion_protection = true

  settings {
    tier = "db-f1-micro"

    # 자동 백업 + PITR(Point-in-Time Recovery) 활성화
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      # 공인 IP 비활성화 + Private IP 사용 (외부 노출 차단)
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"

      # SSL/TLS 강제 (암호화된 연결만 허용)
      ssl_mode = "ENCRYPTED_ONLY"
    }

    # 감사/접속 로깅 (pgAudit 및 연결 로그)
    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }
    database_flags {
      name  = "pgaudit.log"
      value = "write,ddl"
    }
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
  }

  depends_on = [
    google_project_service.sqladmin,
    google_service_networking_connection.private_vpc_connection,
  ]
}

resource "google_sql_database" "app" {
  name     = "pinned"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = "pinned_user"
  instance = google_sql_database_instance.postgres.name

  # Secret Manager에 저장된 랜덤 생성 비밀번호 사용 (평문 하드코딩 제거)
  password = random_password.db_password.result
}
