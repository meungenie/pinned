// frontend/src/layouts/AuthLayout.js
import React from "react";
import { motion } from "framer-motion";
import MainGlobe from "../components/MainGlobe";
import { c, t } from "../theme";

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div style={styles.container}>
      <motion.div layoutId="globe-container" style={styles.leftPanel}>
        <div style={styles.globeWrapper}>
          <MainGlobe width={500} height={500} altitude={1.5} />
        </div>
        <div style={styles.overlayText}>
          <h1 style={styles.logoText}>
            pinned<span style={{ color: c.pin }}>.</span>
          </h1>
          <p style={styles.taglineEn}>pin your world</p>
          <p style={styles.tagline}>너의 세상을 기록해.</p>
        </div>
      </motion.div>

      <div style={styles.rightPanel}>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={t.base}
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
    background: c.bg,
    overflow: "hidden",
  },
  leftPanel: {
    flex: 1.5,
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
    fontWeight: 900,
    color: c.ink,
    margin: 0,
    letterSpacing: "-0.045em",
  },
  taglineEn: {
    color: c.grayLight,
    fontSize: "12px",
    letterSpacing: "0.08em",
    margin: "10px 0 2px",
  },
  tagline: {
    color: c.gray,
    fontSize: "1.05rem",
    margin: 0,
    letterSpacing: "-0.01em",
  },

  rightPanel: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    background: "transparent",
    zIndex: 2,
  },
  formWrapper: { width: "100%", maxWidth: "380px" },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    marginBottom: "8px",
    color: c.ink,
    letterSpacing: "-0.03em",
  },
  subtitle: { color: c.gray, marginBottom: "28px", fontSize: "15px" },
};

export default AuthLayout;
