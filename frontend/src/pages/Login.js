// frontend/src/pages/Login.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { formStyles } from "./Signup"; // 스타일 재사용

const Login = ({ setIsLoggedIn }) => {
  // 임시로 로그인 상태 변경 함수를 받음
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // --- [중요] 여기가 애니메이션 트리거 포인트! ---
    // 실제로는 백엔드 API 통신 성공 후 실행되어야 합니다.
    // 지금은 애니메이션 테스트를 위해 바로 상태를 바꿉니다.
    alert("로그인 성공! 세계가 확장됩니다.");
    setIsLoggedIn(true);
    navigate("/");
    // -----------------------------------------
  };

  return (
    <AuthLayout
      title="다시 오셨군요!"
      subtitle="당신의 기록이 기다리고 있어요."
    >
      <form onSubmit={handleLogin} style={formStyles.form}>
        <input
          type="text"
          placeholder="이메일 또는 @handle"
          style={formStyles.input}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          style={formStyles.input}
          required
        />
        <button type="submit" style={formStyles.button}>
          로그인하기
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

export default Login;
