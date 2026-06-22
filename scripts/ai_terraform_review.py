#!/usr/bin/env python3
"""
AI Terraform PR Reviewer + Auto-Fix
terraform plan JSON을 Claude가 분석해 보안·비용·위험도를 리뷰하고
문제 발견 시 수정 코드를 직접 작성해 Fix PR을 자동으로 생성한다.
"""

import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def claude_create(retries: int = 5, base_delay: int = 15, **kwargs) -> object:
    for attempt in range(retries):
        try:
            return client.messages.create(**kwargs)
        except Exception as e:
            if "overloaded_error" in str(e) and attempt < retries - 1:
                delay = base_delay * (2 ** attempt)
                print(f"⚠️  API 과부하 — {delay}초 후 재시도 ({attempt + 1}/{retries - 1})")
                time.sleep(delay)
            else:
                raise


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


def load_tf_files(terraform_dir: str) -> dict[str, str]:
    files = {}
    for fname in sorted(os.listdir(terraform_dir)):
        if fname.endswith(".tf"):
            with open(os.path.join(terraform_dir, fname)) as f:
                files[fname] = f.read()
    return files


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

    message = claude_create(
        model="claude-opus-4-8",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )
    text_block = next((b for b in message.content if b.type == "text"), None)
    return text_block.text if text_block else "리뷰 생성 실패"


def needs_fix(review: str) -> bool:
    return "수정 요청" in review or "차단" in review


def generate_fixes_with_claude(
    changes: list[dict], review: str, tf_files: dict[str, str]
) -> list[dict]:
    changes_text = build_changes_text(changes)
    files_text = "\n\n".join(
        f"### {fname}\n```hcl\n{content}\n```"
        for fname, content in tf_files.items()
    )

    prompt = f"""당신은 GCP 인프라 보안 전문가입니다.
아래 리뷰에서 발견된 보안/설정 문제를 수정한 Terraform 코드를 작성해주세요.

## 리뷰 결과
{review}

## 현재 Terraform 파일
{files_text}

## 변경된 리소스
{changes_text}

수정이 필요한 파일만 골라서 아래 JSON 형식으로만 응답하세요.
설명 텍스트 없이 JSON 코드블록만 작성하세요.

```json
[
  {{
    "filename": "파일명.tf",
    "content": "수정된 전체 파일 내용 (HCL 형식 그대로)",
    "reason": "수정 이유 한 줄 요약"
  }}
]
```"""

    message = claude_create(
        model="claude-opus-4-8",
        max_tokens=8096,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )

    text = next((b.text for b in message.content if b.type == "text"), "")
    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    raw = match.group(1) if match else text.strip()
    return json.loads(raw)


# ── GitHub API ─────────────────────────────────────────────────────────────────

def github_request(method: str, path: str, data: dict | None = None) -> dict:
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    url = f"https://api.github.com/repos/{repo}/{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method=method,
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def get_pr_info(pr_number: str) -> dict:
    return github_request("GET", f"pulls/{pr_number}")


def create_fix_pr(fixes: list[dict], pr_info: dict, pr_number: str) -> str:
    head_sha = pr_info["head"]["sha"]
    base_branch = pr_info["head"]["ref"]
    fix_branch = f"fix/ai-terraform-pr{pr_number}"

    # 1. 브랜치 생성
    github_request("POST", "git/refs", {
        "ref": f"refs/heads/{fix_branch}",
        "sha": head_sha,
    })
    print(f"✅ 브랜치 생성: {fix_branch}")

    # 2. 파일별 커밋
    for fix in fixes:
        file_path = f"terraform/{fix['filename']}"
        file_info = github_request("GET", f"contents/{file_path}?ref={fix_branch}")
        content_b64 = base64.b64encode(fix["content"].encode()).decode()
        github_request("PUT", f"contents/{file_path}", {
            "message": f"fix: {fix['reason']}",
            "content": content_b64,
            "sha": file_info["sha"],
            "branch": fix_branch,
        })
        print(f"✅ 커밋: {file_path} — {fix['reason']}")

    # 3. PR 생성
    fix_list = "\n".join(f"- **{f['filename']}**: {f['reason']}" for f in fixes)
    pr = github_request("POST", "pulls", {
        "title": f"🤖 AI 자동 수정: #{pr_number} Terraform 보안 이슈",
        "body": (
            f"## 🤖 AI가 자동 생성한 수정 PR\n\n"
            f"원본 PR #{pr_number}에서 발견된 Terraform 보안/설정 문제를 수정합니다.\n\n"
            f"### 수정 내역\n{fix_list}\n\n"
            f"---\n"
            f"*Claude AI가 자동 생성했습니다. 반드시 사람이 검토 후 머지하세요.*"
        ),
        "head": fix_branch,
        "base": base_branch,
    })
    return pr["html_url"]


def post_github_comment(body: str, fix_pr_url: str | None = None) -> None:
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    pr_number = os.environ.get("PR_NUMBER")

    if not all([token, repo, pr_number]):
        print("ℹ️  GitHub 환경변수 없음 — 로컬 출력 모드\n")
        print(body)
        return

    fix_section = ""
    if fix_pr_url:
        fix_section = (
            f"\n\n### 🔧 자동 수정 PR\n"
            f"보안 이슈가 감지되어 수정 PR을 자동으로 생성했습니다: {fix_pr_url}"
        )

    comment = (
        "## 🤖 AI Terraform 리뷰\n"
        "> Claude Opus가 `terraform plan` 결과를 분석했습니다.\n\n"
        f"{body}"
        f"{fix_section}\n\n"
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
    terraform_dir = sys.argv[2] if len(sys.argv) > 2 else "."

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

    fix_pr_url = None
    pr_number = os.environ.get("PR_NUMBER")

    if needs_fix(review) and pr_number:
        print("⚠️  수정 필요 감지 → 자동 수정 PR 생성 중...")
        try:
            tf_files = load_tf_files(terraform_dir)
            fixes = generate_fixes_with_claude(changes, review, tf_files)
            if fixes:
                pr_info = get_pr_info(pr_number)
                fix_pr_url = create_fix_pr(fixes, pr_info, pr_number)
                print(f"✅ 수정 PR 생성 완료: {fix_pr_url}")
            else:
                print("ℹ️  AI가 자동 수정 가능한 항목 없음")
        except Exception as e:
            print(f"⚠️  수정 PR 생성 실패 (리뷰는 계속 진행): {e}")

    post_github_comment(review, fix_pr_url)


if __name__ == "__main__":
    main()
