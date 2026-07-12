import { setToken, removeToken, getToken } from "../utils/auth";

const BASE_URL = "http://localhost:5001";

export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "로그인 실패");
  setToken(data.token);
  return { user: data.user, token: data.token };
};

export const signupUser = async ({ handle, username, email, password }) => {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, username, email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "회원가입 실패");
  setToken(data.token);
  return { user: data.user, token: data.token };
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await fetch(`${BASE_URL}/api/auth/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.avatar_url;
};

export const logoutUser = () => removeToken();

export { getToken } from "../utils/auth";
