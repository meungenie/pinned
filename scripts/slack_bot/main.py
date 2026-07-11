#!/usr/bin/env python3
"""
Pinned GKE Slack Bot (Cloud Run)
- 자연어 클러스터 상태 조회 ("지금 상황 어때?")
- Self-healing 승인/거부 처리 (Slack 버튼 콜백)
- 매일 09:00 KST 일일 브리핑 (Cloud Scheduler 트리거)
"""

import base64
import json
import os
import tempfile
from datetime import datetime, timezone, timedelta

import anthropic
import google.auth
import google.auth.transport.requests
import kubernetes.client
import kubernetes.client.rest
from flask import Flask, jsonify, request
from google.cloud import container_v1
from slack_bolt import App
from slack_bolt.adapter.flask import SlackRequestHandler

PROJECT_ID     = os.environ["PROJECT_ID"]
CLUSTER_NAME   = os.environ["CLUSTER_NAME"]
CLUSTER_REGION = os.environ["CLUSTER_REGION"]
K8S_NAMESPACE  = os.environ.get("K8S_NAMESPACE", "pinned")
SLACK_CHANNEL  = os.environ.get("SLACK_CHANNEL", "#gke-alerts")

ai_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
bolt_app  = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
)


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


def execute_healing(action_data: dict, k8s: kubernetes.client.ApiClient) -> str:
    action    = action_data.get("action")
    target    = action_data.get("target")
    namespace = action_data.get("namespace", K8S_NAMESPACE)

    if action == "no_action" or not target:
        return "조치 없음"

    apps = kubernetes.client.AppsV1Api(k8s)

    if action == "restart_deployment":
        patch = {"spec": {"template": {"metadata": {"annotations": {
            "kubectl.kubernetes.io/restartedAt": datetime.now(timezone.utc).isoformat()
        }}}}}
        apps.patch_namespaced_deployment(target, namespace, patch)
        return f"Deployment '{target}' 재시작 완료"

    if action == "scale_deployment":
        replicas = action_data.get("replicas") or 2
        apps.patch_namespaced_deployment_scale(
            target, namespace, {"spec": {"replicas": replicas}}
        )
        return f"Deployment '{target}' → {replicas}개 레플리카로 스케일 완료"

    if action == "rollback_deployment":
        apps.patch_namespaced_deployment(target, namespace, {"spec": {"rollbackTo": {"revision": 0}}})
        return f"Deployment '{target}' 이전 버전으로 롤백 완료"

    return f"알 수 없는 액션: {action}"


# ── Claude 분석 ────────────────────────────────────────────────────────────────

def claude_answer(user_question: str, cluster_state: dict) -> str:
    message = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": f"""당신은 GKE 인프라 전문가입니다. 팀원이 Slack에서 질문했습니다.

## 질문
{user_question}

## 현재 클러스터 상태 ({K8S_NAMESPACE} 네임스페이스)
{json.dumps(cluster_state, ensure_ascii=False, indent=2)}

친근하고 간결하게 한국어로 답변하세요. 이모지를 사용하고, 문제가 있으면 강조하세요. 3~5문장 이내로 작성하세요."""}],
    )
    return message.content[0].text


def claude_daily_briefing(cluster_state: dict) -> str:
    kst_now  = datetime.now(timezone.utc) + timedelta(hours=9)
    date_str = kst_now.strftime("%Y년 %m월 %d일")
    message  = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": f"""당신은 GKE 인프라 전문가입니다. 아침 일일 브리핑을 작성하세요.

## 날짜: {date_str} 09:00 KST

## 클러스터 상태
{json.dumps(cluster_state, ensure_ascii=False, indent=2)}

Slack markdown 형식으로 작성하세요:
*📊 {date_str} 인프라 브리핑*

전체 상태, 파드별 현황, 특이사항, 오늘의 한마디 순서로 이모지를 풍부하게 사용해 작성하세요."""}],
    )
    return message.content[0].text


# ── Slack 이벤트 핸들러 ────────────────────────────────────────────────────────

@bolt_app.event("app_mention")
def handle_mention(event, say):
    """@bot 지금 상황 어때? 처럼 멘션하면 클러스터 상태를 답변"""
    try:
        k8s   = get_k8s_client()
        state = get_cluster_state(k8s)
        say(claude_answer(event.get("text", ""), state))
    except Exception as e:
        say(f"❌ 클러스터 조회 실패: {e}")


@bolt_app.action("approve_healing")
def handle_approval(ack, body, say):
    """승인 버튼 클릭 → K8s 복구 실행"""
    ack()
    try:
        action_data = json.loads(body["actions"][0]["value"])
        k8s    = get_k8s_client()
        result = execute_healing(action_data, k8s)
        say(f"✅ *승인 완료* — {result}")
    except Exception as e:
        say(f"❌ 실행 실패: {e}")


@bolt_app.action("deny_healing")
def handle_denial(ack, say):
    """거부 버튼 클릭 → 취소"""
    ack()
    say("🚫 *거부됨* — 자동 복구를 취소했습니다. 수동 점검이 필요합니다.")


# ── Flask HTTP 앱 ──────────────────────────────────────────────────────────────

flask_app = Flask(__name__)
handler   = SlackRequestHandler(bolt_app)


@flask_app.route("/slack/events", methods=["POST"])
def slack_events():
    return handler.handle(request)


@flask_app.route("/slack/interactivity", methods=["POST"])
def slack_interactivity():
    return handler.handle(request)


@flask_app.route("/daily-briefing", methods=["POST"])
def daily_briefing():
    """Cloud Scheduler가 매일 09:00 KST에 호출"""
    try:
        k8s      = get_k8s_client()
        state    = get_cluster_state(k8s)
        briefing = claude_daily_briefing(state)
        bolt_app.client.chat_postMessage(
            channel=SLACK_CHANNEL,
            text=briefing,
        )
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@flask_app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    flask_app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
