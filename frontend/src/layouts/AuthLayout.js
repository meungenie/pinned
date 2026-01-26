// frontend/src/layouts/AuthLayout.js
import React from "react";
import { motion } from "framer-motion";
import MainGlobe from "../components/MainGlobe";

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div style={styles.container}>
      <motion.div layoutId="globe-container" style={styles.leftPanel}>
        <div style={styles.globeWrapper}>
          <MainGlobe width={500} height={500} altitude={1.5} />
        </div>
        <div style={styles.overlayText}>
          <h1 style={styles.logoText}>
            pinned<span>.</span>
          </h1>
          <p style={styles.tagline}>너의 세상을 기록해.</p>
        </div>
      </motion.div>

      {/* 오른쪽: 로그인/가입 폼 (배경 통일로 경계선 제거) */}
      <div style={styles.rightPanel}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={styles.formWrapper}
        >
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.subtitle}>{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: "#f8f9fa", // 전체 배경색 통일
    overflow: "hidden",
  },
  leftPanel: {
    flex: 1.5, // [복구] 지구본 영역 비중 확대
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  globeWrapper: {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: { position: "absolute", top: "50px", left: "50px", zIndex: 10 },
  logoText: {
    fontSize: "3rem",
    fontWeight: "900",
    color: "#222",
    margin: 0,
    letterSpacing: "-2px",
  },
  tagline: { color: "#666", fontSize: "1.1rem", marginTop: "5px" },

  rightPanel: {
    flex: 1, // [복구] 폼 영역 비중 축소
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    background: "transparent", // [핵심] 배경색 제거하여 왼쪽과 통합
    zIndex: 2,
  },
  formWrapper: { width: "100%", maxWidth: "380px" },
  title: {
    fontSize: "2.2rem",
    fontWeight: "800",
    marginBottom: "10px",
    color: "#111",
  },
  subtitle: { color: "#666", marginBottom: "30px" },
};

export default AuthLayout;
