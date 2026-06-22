#!/usr/bin/env python3
"""
AI Self-Healing Cloud Function
Cloud Monitoring 알림을 받아 Claude가 GKE 이상 원인을 분석하고
Kubernetes API로 복구 조치를 직접 실행한다.
"""

import base64
import functions_framework
import json
import os
import tempfile
import time

import anthropic
import google.auth
import google.auth.transport.requests
import requests
from google.cloud import container_v1, logging as cloud_logging
import kubernetes.client
import kubernetes.client.rest

PROJECT_ID    = os.environ["PROJECT_ID"]
CLUSTER_NAME  = os.environ["CLUSTER_NAME"]
CLUSTER_REGION = os.environ["CLUSTER_REGION"]
K8S_NAMESPACE = os.environ.get("K8S_NAMESPACE", "pinned")
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK", "")

ai_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


# ── Kubernetes 클라이언트 ───────────────────────────────────────────────────────

def get_k8s_client() -> kubernetes.client.ApiClient:
    container_client = container_v1.ClusterManagerClient()
    cluster = container_client.get_cluster(
        name=f"projects/{PROJECT_ID}/locations/{CLUSTER_REGION}/clusters/{CLUSTER_NAME}"
    )

    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    credentials.refresh(google.auth.transport.requests.Request())

    ca_cert = base64.b64decode(cluster.master_auth.cluster_ca_certificate)
    ca_file = tempfile.NamedTemporaryFile(delete=False, suffix=".crt")
    ca_file.write(ca_cert)
    ca_file.flush()

    config = kubernetes.client.Configuration()
    config.host = f"https://{cluster.endpoint}"
    config.ssl_ca_cert = ca_file.name
    config.api_key = {"authorization": f"Bearer {credentials.token}"}

    return kubernetes.client.ApiClient(config)


# ── 클러스터 상태 수집 ─────────────────────────────────────────────────────────

def get_cluster_state(k8s: kubernetes.client.ApiClient) -> dict:
    core = kubernetes.client.CoreV1Api(k8s)
    apps = kubernetes.client.AppsV1Api(k8s)

    pods = core.list_namespaced_pod(K8S_NAMESPACE)
    deployments = apps.list_namespaced_deployment(K8S_NAMESPACE)

    pod_info = []
    for pod in pods.items:
        containers = []
        for cs in (pod.status.container_statuses or []):
            state = "running"
            if cs.state.waiting:
                state = cs.state.waiting.reason or "waiting"
            elif cs.state.terminated:
                state = f"terminated({cs.state.terminated.reason})"
            containers.append({
                "name": cs.name,
                "ready": cs.ready,
                "restart_count": cs.restart_count,
                "state": state,
            })
        pod_info.append({
            "name": pod.metadata.name,
            "phase": pod.status.phase,
            "containers": containers,
        })

    deploy_info = []
    for d in deployments.items:
        deploy_info.append({
            "name": d.metadata.name,
            "desired": d.spec.replicas,
            "ready": d.status.ready_replicas or 0,
            "available": d.status.available_replicas or 0,
        })

    return {"pods": pod_info, "deployments": deploy_info}


# ── 최근 로그 조회 ─────────────────────────────────────────────────────────────

def get_recent_logs(resource_name: str) -> str:
    log_client = cloud_logging.Client(project=PROJECT_ID)
    filter_str = (
        f'resource.type="k8s_container" '
        f'resource.labels.namespace_name="{K8S_NAMESPACE}" '
        f'severity>="WARNING" '
        f'timestamp>="{_minutes_ago(15)}"'
    )
    if resource_name:
        filter_str += f' resource.labels.container_name="{resource_name}"'

    entries = list(log_client.list_entries(filter_=filter_str, max_results=30, order_by=cloud_logging.DESCENDING))
    if not entries:
        return "최근 15분간 WARNING 이상 로그 없음"

    lines = []
    for e in entries:
        payload = e.payload if isinstance(e.payload, str) else json.dumps(e.payload)
        lines.append(f"[{e.severity}] {payload[:200]}")
    return "\n".join(lines)


def _minutes_ago(n: int) -> str:
    from datetime import datetime, timezone, timedelta
    return (datetime.now(timezone.utc) - timedelta(minutes=n)).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── Claude 분석 ────────────────────────────────────────────────────────────────

HEALING_ACTIONS = {
    "restart_deployment": "특정 Deployment를 재시작합니다.",
    "scale_deployment":   "Deployment의 레플리카 수를 조정합니다.",
    "rollback_deployment": "Deployment를 이전 버전으로 롤백합니다.",
    "no_action":          "자동 복구가 필요하지 않습니다.",
}

def analyze_with_claude(alert: dict, cluster_state: dict, logs: str) -> dict:
    prompt = f"""당신은 GCP GKE 인프라 SRE 전문가입니다.
아래 정보를 바탕으로 이상 원인을 분석하고 복구 조치를 결정해주세요.

## Cloud Monitoring 알림
{json.dumps(alert, ensure_ascii=False, indent=2)}

## 현재 클러스터 상태
{json.dumps(cluster_state, ensure_ascii=False, indent=2)}

## 최근 로그 (15분)
{logs}

## 선택 가능한 조치
{json.dumps(HEALING_ACTIONS, ensure_ascii=False, indent=2)}

아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 작성하세요.

```json
{{
  "diagnosis": "이상 원인 한 줄 요약",
  "severity": "LOW | MEDIUM | HIGH",
  "action": "restart_deployment | scale_deployment | rollback_deployment | no_action",
  "target": "대상 deployment 이름 (없으면 null)",
  "replicas": 대상 레플리카 수 (scale 아니면 null),
  "reason": "이 조치를 선택한 이유 (2~3줄)"
}}
```"""

    for model in ["claude-sonnet-4-6", "claude-opus-4-8"]:
        for attempt in range(2):
            try:
                message = ai_client.messages.create(
                    model=model,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                text = next((b.text for b in message.content if b.type == "text"), "")
                import re
                match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
                raw = match.group(1) if match else text.strip()
                result = json.loads(raw)
                result["model_used"] = model
                return result
            except anthropic.OverloadedError:
                if attempt < 1:
                    time.sleep(10)
                else:
                    break
            except Exception:
                break

    return {
        "diagnosis": "AI 분석 실패 — 수동 점검 필요",
        "severity": "HIGH",
        "action": "no_action",
        "target": None,
        "replicas": None,
        "reason": "Claude API 호출 실패",
        "model_used": "none",
    }


# ── 복구 실행 ──────────────────────────────────────────────────────────────────

def execute_healing(diagnosis: dict, k8s: kubernetes.client.ApiClient) -> str:
    action = diagnosis.get("action")
    target = diagnosis.get("target")

    if action == "no_action" or not target:
        return "조치 없음"

    apps = kubernetes.client.AppsV1Api(k8s)

    if action == "restart_deployment":
        # 롤링 재시작: annotation에 타임스탬프 주입
        from datetime import datetime, timezone
        patch = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": datetime.now(timezone.utc).isoformat()
                        }
                    }
                }
            }
        }
        apps.patch_namespaced_deployment(target, K8S_NAMESPACE, patch)
        return f"Deployment '{target}' 재시작 완료"

    if action == "scale_deployment":
        replicas = diagnosis.get("replicas") or 2
        apps.patch_namespaced_deployment_scale(
            target, K8S_NAMESPACE, {"spec": {"replicas": replicas}}
        )
        return f"Deployment '{target}' → {replicas}개 레플리카로 스케일 조정 완료"

    if action == "rollback_deployment":
        # 이전 ReplicaSet으로 롤백
        patch = {"spec": {"rollbackTo": {"revision": 0}}}
        apps.patch_namespaced_deployment(target, K8S_NAMESPACE, patch)
        return f"Deployment '{target}' 이전 버전으로 롤백 완료"

    return f"알 수 없는 액션: {action}"


# ── Slack 알림 ─────────────────────────────────────────────────────────────────

def notify_slack(alert: dict, diagnosis: dict, result: str) -> None:
    if not SLACK_WEBHOOK:
        print("ℹ️  SLACK_WEBHOOK 없음 — Slack 알림 스킵")
        return

    severity_emoji = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🔴"}.get(diagnosis.get("severity"), "⚪")
    action_emoji = "🔧" if diagnosis.get("action") != "no_action" else "✅"

    payload = {
        "text": f"{severity_emoji} *GKE Self-Healing 알림*",
        "attachments": [
            {
                "color": {"LOW": "good", "MEDIUM": "warning", "HIGH": "danger"}.get(diagnosis.get("severity"), "#ccc"),
                "fields": [
                    {"title": "진단", "value": diagnosis.get("diagnosis", "-"), "short": False},
                    {"title": f"{action_emoji} 조치 결과", "value": result, "short": False},
                    {"title": "이유", "value": diagnosis.get("reason", "-"), "short": False},
                    {"title": "분석 모델", "value": diagnosis.get("model_used", "-"), "short": True},
                    {"title": "위험도", "value": diagnosis.get("severity", "-"), "short": True},
                ],
            }
        ],
    }

    try:
        requests.post(SLACK_WEBHOOK, json=payload, timeout=5)
        print("✅ Slack 알림 전송 완료")
    except Exception as e:
        print(f"⚠️  Slack 알림 실패: {e}")


# ── Cloud Function 진입점 ──────────────────────────────────────────────────────

@functions_framework.cloud_event
def self_heal(cloud_event) -> None:
    # Pub/Sub 메시지 파싱 (제어 문자 제거 후 파싱)
    raw = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8", errors="replace")
    import re as _re
    raw = _re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw)
    alert = json.loads(raw)
    incident = alert.get("incident", {})
    resource_name = incident.get("resource", {}).get("labels", {}).get("container_name", "")

    print(f"📡 알림 수신: {incident.get('condition_name', '알 수 없는 조건')}")
    print(f"   상태: {incident.get('state')}, 리소스: {resource_name}")

    try:
        k8s = get_k8s_client()
        cluster_state = get_cluster_state(k8s)
        logs = get_recent_logs(resource_name)

        print("🤖 Claude 분석 중...")
        diagnosis = analyze_with_claude(alert, cluster_state, logs)
        print(f"   진단: {diagnosis['diagnosis']}")
        print(f"   조치: {diagnosis['action']} → {diagnosis.get('target')}")

        result = execute_healing(diagnosis, k8s)
        print(f"✅ 복구 결과: {result}")

        notify_slack(alert, diagnosis, result)

    except Exception as e:
        print(f"❌ Self-Healing 실패: {e}")
        notify_slack(
            alert,
            {"diagnosis": str(e), "severity": "HIGH", "action": "no_action",
             "reason": "Self-Healing 실행 중 오류 발생", "model_used": "none"},
            "자동 복구 실패 — 수동 점검 필요",
        )
        raise
