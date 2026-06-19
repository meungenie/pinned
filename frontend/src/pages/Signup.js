import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { signupUser } from "../api/authApi";

const Signup = ({ onLogin }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ handle: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signupUser(form);
      onLogin(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="계정 만들기" subtitle="세상을 기록하기 시작해요.">
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
          {loading ? "가입 중..." : "가입 완료 🚀"}
        </button>
      </form>
      <p style={{ marginTop: "20px", color: "#666" }}>
        이미 계정이 있으신가요?{" "}
        <Link to="/login" style={{ fontWeight: "bold", color: "#222" }}>
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
};

const styles = {
  error: { color: "#e53e3e", fontSize: "14px", margin: 0 },
};

export const formStyles = {
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: {
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid #eee",
    fontSize: "1rem",
    outline: "none",
    background: "#f9f9f9",
    transition: "all 0.2s",
  },
  button: {
    padding: "15px",
    borderRadius: "12px",
    border: "none",
    background: "#222",
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
  },
};

export default Signup;
