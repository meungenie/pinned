// frontend/src/layouts/AuthLayout.js
import React from "react";
import { motion } from "framer-motion";
import MainGlobe from "../components/MainGlobe"; // 지구본 컴포넌트 경로 확인!

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div style={styles.container}>
      {/* 왼쪽: 애니메이션 될 지구본 영역 */}
      {/* layoutId="globe-container"가 마법의 핵심입니다. 다른 페이지의 동일한 ID와 자연스럽게 연결됩니다. */}
      <motion.div layoutId="globe-container" style={styles.leftPanel}>
        <MainGlobe />
        {/* 지구본 위에 텍스트 얹기 */}
        <div style={styles.overlayText}>
          <h1 style={{ fontSize: "3rem", margin: 0 }}>pinned.</h1>
        </div>
      </motion.div>

      {/* 오른쪽: 로그인/회원가입 폼 영역 */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: "#fff",
  },
  leftPanel: {
    flex: 1,
    position: "relative",
    background: "#f1f2f6",
    overflow: "hidden",
    borderRadius: "0 30px 30px 0",
    boxShadow: "5px 0 20px rgba(0,0,0,0.05)",
    zIndex: 1,
  },
  overlayText: {
    position: "absolute",
    top: "40px",
    left: "40px",
    color: "#222",
    zIndex: 10,
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
  },
  formWrapper: { width: "100%", maxWidth: "400px" },
  title: { fontSize: "2rem", fontWeight: "800", marginBottom: "10px" },
  subtitle: { color: "#666", marginBottom: "30px" },
};

export default AuthLayout;
