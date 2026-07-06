# ── Cloud Armor WAF 보안 정책 ──────────────────────────────────────────────────
#
# 트래픽 흐름: 인터넷 → Cloud Armor → GCP Load Balancer → BackendConfig → Pod
#
# 우선순위(priority) 낮을수록 먼저 적용됨
# 1000~1999 : OWASP WAF 룰 (공격 차단)
# 9000      : Rate Limiting (API 남용 방지)
# 2147483647: 기본 허용 (필수, 마지막에 위치)

resource "google_compute_security_policy" "waf" {
  name        = "pinned-waf-policy"
  description = "Cloud Armor WAF — OWASP Top 10 + Rate Limiting + DDoS 방어"

  # ── OWASP Pre-configured WAF Rules ──────────────────────────────────────────
  # sensitivity 1 = 가장 정밀한 탐지 (오탐 최소화)
  # sensitivity 4 = 광범위 탐지 (오탐 가능성 있음)
  # 프로덕션 초기에는 1로 시작하고 로그 보면서 올리는 게 일반적

  rule {
    action      = "deny(403)"
    priority    = 1000
    description = "SQL Injection 차단 (OWASP A03)"
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  rule {
    action      = "deny(403)"
    priority    = 1001
    description = "XSS 차단 (OWASP A03)"
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  rule {
    action      = "deny(403)"
    priority    = 1002
    description = "Local File Inclusion 차단 (OWASP A01)"
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('lfi-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  rule {
    action      = "deny(403)"
    priority    = 1003
    description = "Remote Code Execution 차단 (Log4Shell 등)"
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('rce-v33-canary', {'sensitivity': 1})"
      }
    }
  }

  rule {
    action      = "deny(403)"
    priority    = 1004
    description = "Protocol Attack 차단 (HTTP Request Smuggling 등)"
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('protocolattack-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  # ── Rate Limiting ────────────────────────────────────────────────────────────
  # IP당 60초에 100 요청 초과 시 429 응답
  # 정상 사용자는 영향 없고 스크래퍼/브루트포스 차단
  rule {
    action      = "throttle"
    priority    = 9000
    description = "Rate Limiting — IP당 100 req/min 초과 시 차단"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
  }

  # ── 기본 허용 (필수 규칙) ────────────────────────────────────────────────────
  rule {
    action      = "allow"
    priority    = 2147483647
    description = "위 규칙에 해당하지 않는 나머지 트래픽 허용"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }

  # ── Adaptive Protection (L7 DDoS 자동 방어) ──────────────────────────────────
  # 트래픽 패턴을 학습해 DDoS 공격을 자동 감지·차단
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }

  depends_on = [google_project_service.apis["compute.googleapis.com"]]
}
