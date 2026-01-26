import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import MainGlobe from "./components/MainGlobe";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 브라우저 창 크기를 실시간으로 감지하여 지구본 크기 조절
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          {/* 1. 로그인/회원가입 단계 */}
          {!isLoggedIn && (
            <>
              <Route
                path="/login"
                element={<Login setIsLoggedIn={setIsLoggedIn} />}
              />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </>
          )}

          {/* 2. 로그인 성공 후 메인 화면 (전체 화면 중앙 배치) */}
          {isLoggedIn && (
            <Route
              path="/"
              element={
                <div style={styles.mainContainer}>
                  {/* [핵심] layoutId="globe-container"
                      로그인 창의 지구가 웅장하게 커지면서 정중앙으로 이동합니다.
                  */}
                  <motion.div
                    layoutId="globe-container"
                    style={styles.globeWrapper}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                  >
                    {/* 브라우저 창 크기(windowSize)보다 약간 더 크게 잡아 여유를 줍니다 */}
                    <MainGlobe
                      width={
                        Math.max(windowSize.width, windowSize.height) * 1.2
                      }
                      height={
                        Math.max(windowSize.width, windowSize.height) * 1.2
                      }
                      altitude={4.8}
                    />
                  </motion.div>

                  {/* UI 레이어 */}
                  <div style={styles.uiOverlay}>
                    <h1 style={styles.mainLogo}>
                      pinned<span>.</span>
                    </h1>
                    <button
                      onClick={() => setIsLoggedIn(false)}
                      style={styles.logoutBtn}
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              }
            />
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

const styles = {
  mainContainer: {
    width: "100vw",
    height: "100vh",
    position: "relative",
    background: "#f8f9fa", // 배경색 통일
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // 화면 밖으로 나가는 것은 숨김
  },
  globeWrapper: {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    // [중요] 내부의 큰 지구가 잘리지 않도록 넘침 허용
    overflow: "visible",
  },
  uiOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 10,
    pointerEvents: "none", // 클릭이 지구본(핀)에 닿게 함
  },
  mainLogo: {
    position: "absolute",
    top: "40px",
    left: "50px",
    fontSize: "2.8rem",
    fontWeight: "900",
    color: "#222",
    margin: 0,
    pointerEvents: "auto",
  },
  logoutBtn: {
    position: "absolute",
    top: "45px",
    right: "50px",
    padding: "12px 24px",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "25px",
    fontWeight: "bold",
    cursor: "pointer",
    pointerEvents: "auto",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  },
};

export default App;
