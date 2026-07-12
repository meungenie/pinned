// frontend/src/theme.js
// 디자인 토큰 단일 소스. 색/radius/모션은 전부 여기서 import해서 사용.
// 규칙: UI는 무채색, 유채색은 pin 하나만 (로고 점, 지도 핀, 핵심 액션).

export const c = {
  bg: "#FCFCFA", // 페이지 배경 (미세하게 웜한 화이트)
  ink: "#101012", // 텍스트, 주요 버튼
  gray: "#8A8A85", // 보조 텍스트
  grayLight: "#B9B7B1", // 비활성, 플레이스홀더
  hairline: "#ECECE8", // 구분선, 카드 테두리
  surface: "#FFFFFF", // 카드, 모달
  pin: "#FF3B1C", // 유일한 유채색
};

export const r = {
  card: 22,
  control: 14,
  pill: 999,
};

// ── framer-motion 프리셋 ─────────────────────────────
// 통통 튀는 spring 금지. 빠르고 절제된 ease-out으로 통일.
export const ease = [0.25, 0.1, 0.25, 1];

export const t = {
  fast: { duration: 0.15, ease },
  base: { duration: 0.22, ease },
  slow: { duration: 0.32, ease },
};

export const tap = { scale: 0.97 };

// 카드/모달 공용 등장 모션
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: t.base,
};

export const modalPop = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97 },
  transition: t.base,
};

// ── 공용 폼 스타일 (기존 Signup.js의 formStyles 이관) ──
// Login.js / Signup.js에서: import { formStyles } from "../theme";
export const formStyles = {
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    padding: "15px 16px",
    borderRadius: `${r.control}px`,
    border: `1px solid ${c.hairline}`,
    fontSize: "15px",
    outline: "none",
    background: c.surface,
    color: c.ink,
    fontFamily: "inherit",
    letterSpacing: "-0.01em",
    transition: "border-color 0.15s ease",
  },
  button: {
    padding: "15px",
    borderRadius: `${r.control}px`,
    border: "none",
    background: c.ink,
    color: c.bg,
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    marginTop: "8px",
    fontFamily: "inherit",
  },
};
