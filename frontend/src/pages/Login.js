import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { formStyles } from "./Signup";
import { loginUser } from "../api/authApi";

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await loginUser(email, password);
      onLogin(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="다시 오셨군요!" subtitle="당신의 기록이 기다리고 있어요.">
      <form onSubmit={handleLogin} style={formStyles.form}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={formStyles.input}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={formStyles.input}
          required
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ ...formStyles.button, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "로그인 중..." : "로그인하기"}
        </button>
      </form>
      <p style={{ marginTop: "20px", color: "#666" }}>
        아직 회원이 아니신가요?{" "}
        <Link to="/signup" style={{ fontWeight: "bold", color: "#222" }}>
          회원가입
        </Link>
      </p>
    </AuthLayout>
  );
};

const styles = {
  error: { color: "#e53e3e", fontSize: "14px", margin: 0 },
};

export default Login;
