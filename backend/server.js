/**
 * pinned. Backend Server Entry Point
 * 보안 및 안정성을 고려한 프로덕션 급 설정
 */
require("dotenv").config(); // 환경 변수 로드
const app = require("./src/app"); // 설정된 Express 앱 가져오기

const PORT = process.env.PORT || 5000;

// 1. 서버 실행
const server = app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Server is running on port: ${PORT}`);
  console.log(`🛠️ Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`========================================`);
});

// 2. 예기치 못한 에러 처리 (Unhandled Rejections)
// 프로미스 에러가 처리되지 않았을 때 서버가 그냥 죽는 것을 방지
process.on("unhandledRejection", (err) => {
  console.error(`🔴 Unhandled Rejection: ${err.message}`);
  // 서버를 안전하게 종료하고 프로세스 중단
  server.close(() => process.exit(1));
});

// 3. Graceful Shutdown (SRE 필수 설정)
// 컨테이너(Docker/K8s) 환경에서 종료 신호를 받았을 때 진행 중인 작업을 마무리하고 종료
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Process terminated.");
  });
});
