import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { c, r, formStyles } from "../theme";
import { signupUser, uploadAvatar } from "../api/authApi";

const Signup = ({ onLogin }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    handle: "",
    username: "",
    email: "",
    password: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signupUser(form);
      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar(avatarFile);
          user.avatar_url = avatarUrl;
        } catch (avatarErr) {
          console.error("[AVATAR_UPLOAD_ERROR]", avatarErr);
        }
      }
      onLogin(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = form.username
    ? form.username[0].toUpperCase()
    : form.handle
    ? form.handle[0].toUpperCase()
    : "+";

  return (
    <AuthLayout title="계정 만들기" subtitle="세상을 기록하기 시작해요.">
      {/* 프로필 사진 선택 */}
      <div style={styles.avatarSection}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          style={styles.avatarBtn}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="프로필" style={styles.avatarImg} />
          ) : (
            <span style={styles.avatarInitial}>{initials}</span>
          )}
          <span style={{ ...styles.avatarOverlay, opacity: avatarHover ? 1 : 0 }}>
            사진 선택
          </span>
        </button>
        <p style={styles.avatarHint}>프로필 사진 (선택)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
        />
      </div>

      <form onSubmit={handleSubmit} style={formStyles.form}>
        <input
          type="text"
          name="handle"
          placeholder="@handle (고유 아이디, 영문+숫자)"
          value={form.handle}
          onChange={handleChange}
          style={formStyles.input}
          required
        />
        <input
          type="text"
          name="username"
          placeholder="이름"
          value={form.username}
          onChange={handleChange}
          style={formStyles.input}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="이메일"
          value={form.email}
          onChange={handleChange}
          style={formStyles.input}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호 (6자 이상)"
          value={form.password}
          onChange={handleChange}
          style={formStyles.input}
          required
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ ...formStyles.button, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "가입 중..." : "시작하기"}
        </button>
      </form>
      <p style={{ marginTop: "20px", color: c.gray, fontSize: "14px" }}>
        이미 계정이 있으신가요?{" "}
        <Link to="/login" style={{ fontWeight: 700, color: c.ink }}>
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
};

const AVATAR_SIZE = 80;

const styles = {
  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "24px",
  },
  avatarBtn: {
    position: "relative",
    width: `${AVATAR_SIZE}px`,
    height: `${AVATAR_SIZE}px`,
    borderRadius: "50%",
    background: c.hairline,
    border: "none",
    cursor: "pointer",
    overflow: "hidden",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarInitial: {
    fontSize: "28px",
    fontWeight: 700,
    color: c.gray,
    fontFamily: "inherit",
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    fontSize: "11px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.15s",
    fontFamily: "inherit",
  },
  avatarHint: {
    fontSize: "12px",
    color: c.grayLight,
    margin: "8px 0 0",
  },
  error: { color: c.pin, fontSize: "13px", margin: 0 },
};

export default Signup;
