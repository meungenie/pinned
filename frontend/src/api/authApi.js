import { setToken, removeToken, getToken } from "../utils/auth";
import { BASE_URL } from "../config";

export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "로그인 실패");
  setToken(data.accessToken);
  return { user: data.user };
};

export const signupUser = async ({ handle, username, email, password }) => {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ handle, username, email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "회원가입 실패");
  setToken(data.accessToken);
  return { user: data.user };
};

export const refreshAccessToken = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error("refresh 실패");
  setToken(data.accessToken);
  return data.user;
};

export const logoutUser = async () => {
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${getToken()}` },
  }).catch(() => {});
  removeToken();
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await fetch(`${BASE_URL}/api/auth/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    credentials: "include",
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.avatar_url;
};

export { getToken } from "../utils/auth";
