const BASE_URL = "http://localhost:5001";

export const fetchPins = async () => {
  const res = await fetch(`${BASE_URL}/api/pins`);
  if (!res.ok) throw new Error("핀 목록을 불러오지 못했습니다.");
  const { pins } = await res.json();
  return pins;
};

export const createPin = async ({ lat, lng, title }, token) => {
  const res = await fetch(`${BASE_URL}/api/pins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lat, lng, title }),
  });
  if (!res.ok) throw new Error("핀을 저장하지 못했습니다.");
  const { pin } = await res.json();
  return pin;
};
