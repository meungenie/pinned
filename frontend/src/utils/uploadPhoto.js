import { getToken } from "./auth";

const BASE_URL = "http://localhost:5001";

export const uploadPhoto = async (file, postId, index) => {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("order_index", index);

  const res = await fetch(`${BASE_URL}/api/posts/${postId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.photo.url;
};
