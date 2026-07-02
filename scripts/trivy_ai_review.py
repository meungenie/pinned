#!/usr/bin/env python3
"""
AI Trivy Image Security Scanner
컨테이너 이미지의 취약점을 Trivy로 스캔한 결과를 Claude가 분석해
위험도 평가, 우선 패치 가이드, 배포 허용 여부를 판단한다.
"""

import json
import os
import sys
import time

import anthropic
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

_FALLBACK_MODELS = ["claude-opus-4-8", "claude-sonnet-4-6"]

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
SEVERITY_EMOJI = {
    "CRITICAL": "🚨",
    "HIGH": "🔴",
    "MEDIUM": "🟡",
    "LOW": "🟢",
    "UNKNOWN": "⚪",
}


def claude_create(retries: int = 2, base_delay: int = 10, **kwargs) -> object:
    for model in _FALLBACK_MODELS:
        kwargs["model"] = model
        for attempt in range(retries):
            try:
                print(f"🤖 {model} 호출 중...")
                return client.messages.create(**kwargs)
            except anthropic.OverloadedError:
                if attempt < retries - 1:
                    delay = base_delay * (2**attempt)
                    print(f"⚠️  과부하 — {delay}초 후 재시도")
                    time.sleep(delay)
                else:
                    print(f"⚠️  {model} 과부하 — 다음 모델로 전환")
    raise RuntimeError("모든 모델이 과부하 상태입니다. 잠시 후 다시 시도하세요.")


def load_trivy_report(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def extract_vulns(report: dict) -> list[dict]:
    vulns = []
    for result in report.get("Results", []):
        target = result.get("Target", "")
        for v in result.get("Vulnerabilities") or []:
            vulns.append({
                "target": target,
                "id": v.get("VulnerabilityID", ""),
                "severity": v.get("Severity", "UNKNOWN"),
                "package": v.get("PkgName", ""),
                "installed": v.get("InstalledVersion", ""),
                "fixed": v.get("FixedVersion") or "패치 없음",
                "title": v.get("Title", ""),
                "description": (v.get("Description") or "")[:200],
                "cvss": v.get("CVSS", {}).get("nvd", {}).get("V3Score"),
            })
    return vulns


def summarize(vulns: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {s: 0 for s in SEVERITY_ORDER}
    for v in vulns:
        sev = v["severity"]
        counts[sev] = counts.get(sev, 0) + 1
    return counts


def build_vuln_text(vulns: list[dict], max_per_severity: int = 5) -> str:
    grouped: dict[str, list] = {s: [] for s in SEVERITY_ORDER}
    for v in vulns:
        grouped.setdefault(v["severity"], []).append(v)

    lines = []
    for severity in SEVERITY_ORDER:
        items = grouped.get(severity, [])
        if not items:
            continue
        emoji = SEVERITY_EMOJI.get(severity, "")
        lines.append(f"\n### {emoji} {severity} ({len(items)}개)")
        for v in items[:max_per_severity]:
            cvss = f" CVSS {v['cvss']}" if v["cvss"] else ""
            line = f"- [{v['id']}]{cvss} `{v['package']}` {v['installed']}"
            if v["fixed"] != "패치 없음":
                line += f" → fix: **{v['fixed']}**"
            if v["title"]:
                line += f"\n  {v['title']}"
            lines.append(line)
        if len(items) > max_per_severity:
            lines.append(f"  _... 외 {len(items) - max_per_severity}개_")
    return "\n".join(lines)


def analyze_with_claude(vulns: list[dict], summary: dict, image: str) -> str:
    vuln_text = build_vuln_text(vulns)
    total = sum(summary.values())

    prompt = f"""당신은 컨테이너 보안 전문가입니다. 아래 Trivy 스캔 결과를 분석하고 한국어로 리뷰를 작성해주세요.

## 스캔 대상
이미지: {image}
총 취약점: {total}개 (CRITICAL: {summary.get('CRITICAL', 0)}, HIGH: {summary.get('HIGH', 0)}, MEDIUM: {summary.get('MEDIUM', 0)}, LOW: {summary.get('LOW', 0)})

## 취약점 상세
{vuln_text}

다음 형식으로 리뷰를 작성해주세요:

### 📊 위험도 평가
전체 위험도를 🟢 LOW / 🟡 MEDIUM / 🔴 HIGH / 🚨 CRITICAL 중 하나로 평가하고 한 줄 이유를 적어주세요.

### 🔍 주요 취약점 분석
CRITICAL/HIGH 중 실제 익스플로잇 가능성이 높은 상위 3개를 골라 왜 위험한지 구체적으로 설명하세요.

### 🛠️ 즉시 조치 권고
패치 가능한 것 중 우선순위 높은 것부터 구체적인 조치 방법을 적어주세요.
(베이스 이미지 업그레이드, 특정 패키지 버전 고정 등)

### 💡 중장기 보안 강화 방안
현재 이미지 구조에서 보안을 강화할 수 있는 방법을 제안해주세요.
(distroless 이미지, 멀티스테이지 빌드, 불필요 패키지 제거 등)

### ✅ 배포 권고
아래 중 하나를 선택하고 이유를 적어주세요:
- **배포 허용** — 위험 수준이 허용 범위 내
- **조건부 허용** — 특정 이슈 인지 후 배포 가능
- **배포 차단** — CRITICAL 취약점 즉시 패치 필요"""

    message = claude_create(
        model="claude-opus-4-8",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    text_block = next((b for b in message.content if b.type == "text"), None)
    return text_block.text if text_block else "분석 생성 실패"


def should_block(summary: dict) -> bool:
    return summary.get("CRITICAL", 0) > 0


def write_step_summary(analysis: str, summary: dict, image: str) -> None:
    total = sum(summary.values())

    badge_parts = [
        f"{SEVERITY_EMOJI.get(s, '')} {s}: {summary[s]}"
        for s in SEVERITY_ORDER
        if summary.get(s, 0) > 0
    ]

    content = (
        "## 🔍 AI 컨테이너 보안 스캔 결과\n"
        "> Trivy + Claude Opus가 이미지 취약점을 분석했습니다.\n\n"
        f"**이미지**: `{image}`  \n"
        f"**총 취약점**: {total}개  \n"
        f"{' | '.join(badge_parts)}\n\n"
        "---\n\n"
        f"{analysis}\n\n"
        "---\n"
        "*자동 생성된 보안 리뷰입니다. 최종 판단은 담당자가 직접 확인하세요.*"
    )

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a") as f:
            f.write(content)
        print("✅ GitHub Step Summary 작성 완료")
    else:
        print("\n" + content)


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: trivy_ai_review.py <trivy-report.json> <image-name>")
        sys.exit(1)

    report_path, image = sys.argv[1], sys.argv[2]

    if not os.path.exists(report_path):
        print(f"❌ Trivy 리포트를 찾을 수 없습니다: {report_path}")
        sys.exit(1)

    report = load_trivy_report(report_path)
    vulns = extract_vulns(report)
    summary = summarize(vulns)
    total = sum(summary.values())

    if not vulns:
        print("✅ 취약점 없음 — 배포 진행")
        return

    print(f"🔍 총 {total}개 취약점 발견 → Claude 분석 중...")
    analysis = analyze_with_claude(vulns, summary, image)
    write_step_summary(analysis, summary, image)

    if should_block(summary):
        print(f"\n🚨 CRITICAL 취약점 {summary['CRITICAL']}개 발견 — 배포 차단")
        sys.exit(1)

    print("✅ 보안 스캔 완료 — 배포 진행")


if __name__ == "__main__":
    main()
