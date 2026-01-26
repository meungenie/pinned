// frontend/src/App.js
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // AnimatePresence 추가
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import MainGlobe from "./components/MainGlobe";

function App() {
  // [임시] 로그인 상태 관리 (나중엔 리덕스나 Context API로 대체)
  // false면 로그인/가입 화면, true면 메인 지구본 화면
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      {/* AnimatePresence: 컴포넌트가 사라질 때 애니메이션을 가능하게 함 */}
      <AnimatePresence mode="wait">
        <Routes>
          {/* 1. 비로그인 상태 라우트 */}
          {!isLoggedIn && (
            <>
              <Route
                path="/login"
                element={<Login setIsLoggedIn={setIsLoggedIn} />}
              />
              <Route path="/signup" element={<Signup />} />
              {/* 루트로 오면 로그인으로 리다이렉트 */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </>
          )}

          {/* 2. 로그인 성공 후 메인 화면 (지구본 전체 화면) */}
          {isLoggedIn && (
            <Route
              path="/"
              element={
                <div
                  style={{
                    width: "100vw",
                    height: "100vh",
                    position: "relative",
                  }}
                >
                  {/* [핵심] layoutId="globe-container" 
                    AuthLayout에 있던 작은 지구본 컨테이너와 같은 ID입니다.
                    Framer Motion이 이 두 개가 같은 요소임을 인식하고 크기와 위치를 부드럽게 연결합니다.
                 */}
                  <motion.div
                    layoutId="globe-container"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <MainGlobe />
                  </motion.div>

                  {/* 메인 화면 UI 요소들 */}
                  <h1
                    style={{
                      position: "absolute",
                      top: "20px",
                      left: "20px",
                      zIndex: 100,
                    }}
                  >
                    pinned.
                  </h1>
                  <button
                    onClick={() => setIsLoggedIn(false)}
                    style={{
                      position: "absolute",
                      top: "20px",
                      right: "20px",
                      zIndex: 100,
                      padding: "10px 20px",
                      background: "white",
                      border: "none",
                      borderRadius: "20px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    로그아웃 (테스트용)
                  </button>
                </div>
              }
            />
          )}

          {/* 잘못된 경로는 루트로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;
