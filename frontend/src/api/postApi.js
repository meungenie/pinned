import { getToken } from "../utils/auth";

const BASE_URL = "http://localhost:5001";
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const fetchPinPosts = async (pinId) => {
  const res = await fetch(`${BASE_URL}/api/pins/${pinId}/posts`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.posts;
};

export const createPost = async (pinId, { title, content, visited_from, visited_to }) => {
  const res = await fetch(`${BASE_URL}/api/pins/${pinId}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title, content, visited_from, visited_to }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.post;
};

export const fetchPostComments = async (postId) => {
  const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.comments;
};

export const createComment = async (postId, content) => {
  const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.comment;
};
