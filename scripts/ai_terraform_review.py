#!/usr/bin/env python3
"""
AI Terraform PR Reviewer
terraform plan JSON을 Claude가 분석해 보안·비용·위험도를 리뷰하고
GitHub PR에 자동으로 코멘트를 남긴다.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def extract_changes(plan: dict) -> list[dict]:
    return [
        {
            "address": r["address"],
            "type": r["type"],
            "actions": r["change"]["actions"],
            "after": r["change"].get("after"),
        }
        for r in plan.get("resource_changes", [])
        if "no-op" not in r["change"]["actions"]
    ]


def summarize(changes: list[dict]) -> dict:
    counts = {"create": 0, "update": 0, "delete": 0, "replace": 0}
    for c in changes:
        actions = c["actions"]
        if "create" in actions and "delete" in actions:
            counts["replace"] += 1
        elif "create" in actions:
            counts["create"] += 1
        elif "update" in actions:
            counts["update"] += 1
        elif "delete" in actions:
            counts["delete"] += 1
    return counts


def build_changes_text(changes: list[dict]) -> str:
    notable_fields = [
        "name", "location", "role", "member",
        "public_access_prevention", "uniform_bucket_level_access",
        "enable_autopilot", "deletion_protection", "format",
    ]
    lines = []
    for c in changes:
        action = " + ".join(c["actions"]).upper()
        line = f"[{action}] {c['address']} ({c['type']})"
        if c.get("after"):
            fields = [
                f"  {k}: {json.dumps(c['after'][k])}"
                for k in notable_fields
                if k in c["after"]
            ]
            if fields:
                line += "\n" + "\n".join(fields)
        lines.append(line)
    return "\n\n".join(lines)


def review_with_claude(changes: list[dict], summary: dict) -> str:
    changes_text = build_changes_text(changes)

    prompt = f"""당신은 GCP 인프라 보안 전문가입니다. 아래 Terraform 변경사항을 검토하고 한국어로 리뷰를 작성해주세요.

## 변경 요약
- 생성: {summary['create']}개 | 수정: {summary['update']}개 | 삭제: {summary['delete']}개 | 재생성: {summary['replace']}개

## 변경 상세
{changes_text}

다음 형식으로 리뷰를 작성해주세요:

### 📊 위험도 평가
전체 위험도를 🟢 LOW / 🟡 MEDIUM / 🔴 HIGH 중 하나로 평가하고 한 줄 이유를 적어주세요.

### 📝 변경 요약
무엇이 어떻게 바뀌는지 3~5줄로 요약하세요.

### 🔒 보안 검토
보안 관점에서 주의할 점, 잘된 점을 구분해서 적어주세요. 없으면 "특이사항 없음"으로 적어주세요.

### 💰 비용 영향
이 변경으로 예상되는 비용 변화를 간략히 설명하세요.

### ✅ 권고사항
아래 중 하나를 선택하고 이유를 적어주세요:
- **승인** — 변경해도 안전함
- **수정 요청** — 특정 부분 수정 후 승인
- **차단** — 즉시 적용하면 위험함"""

    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        message = stream.get_final_message()

    text_block = next((b for b in message.content if b.type == "text"), None)
    return text_block.text if text_block else "리뷰 생성 실패"


def post_github_comment(body: str) -> None:
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    pr_number = os.environ.get("PR_NUMBER")

    if not all([token, repo, pr_number]):
        print("ℹ️  GitHub 환경변수 없음 — 로컬 출력 모드\n")
        print(body)
        return

    comment = (
        "## 🤖 AI Terraform 리뷰\n"
        "> Claude Opus가 `terraform plan` 결과를 분석했습니다.\n\n"
        f"{body}\n\n"
        "---\n"
        "*자동 생성된 리뷰입니다. 최종 판단은 담당자가 직접 확인하세요.*"
    )

    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    data = json.dumps({"body": comment}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as res:
            if res.status == 201:
                print(f"✅ PR #{pr_number}에 AI 리뷰 코멘트 게시 완료")
    except urllib.error.HTTPError as e:
        print(f"❌ GitHub API 실패: {e.code} — {e.read().decode()}")
        sys.exit(1)


def main() -> None:
    plan_path = sys.argv[1] if len(sys.argv) > 1 else "plan.json"

    if not os.path.exists(plan_path):
        print(f"❌ plan.json을 찾을 수 없습니다: {plan_path}")
        sys.exit(1)

    with open(plan_path) as f:
        plan = json.load(f)

    changes = extract_changes(plan)
    summary = summarize(changes)

    if not changes:
        print("✅ 변경사항 없음 — 리뷰 스킵")
        return

    print(f"🔍 {len(changes)}개 리소스 변경 감지 → Claude 분석 중...")
    review = review_with_claude(changes, summary)
    post_github_comment(review)


if __name__ == "__main__":
    main()
