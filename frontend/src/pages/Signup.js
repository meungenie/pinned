// frontend/src/pages/Signup.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";

const Signup = () => {
  // ... (상단 useState, handleChange, handleSubmit 로직은 아까와 동일하므로 생략)
  // 테스트를 위해 handleSubmit 성공 부분에 navigate('/') 로 메인으로 가게 임시 수정해도 좋습니다.

  return (
    <AuthLayout title="계정 만들기" subtitle="이미 계정이 있나요? 로그인하기">
      <form style={formStyles.form}>
        <input
          type="text"
          name="handle"
          placeholder="@handle (고유 아이디)"
          style={formStyles.input}
          required
        />
        {/* 나머지 인풋들도 동일한 스타일 적용 */}
        <input
          type="text"
          name="username"
          placeholder="이름"
          style={formStyles.input}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="이메일"
          style={formStyles.input}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호 (8자 이상)"
          style={formStyles.input}
          required
        />
        <button type="submit" style={formStyles.button}>
          가입 완료 🚀
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

// 공통 스타일 (나중에 별도 파일로 분리 가능)
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
