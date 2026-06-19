import { getToken } from "../utils/auth";

const BASE_URL = "http://localhost:5001";
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const fetchMyGroups = async () => {
  const res = await fetch(`${BASE_URL}/api/groups/me`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.groups;
};

export const fetchGroupInfo = async (groupId) => {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.group;
};

export const createGroup = async ({ name, description }) => {
  const res = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, description }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.group;
};

export const getGroupByInviteCode = async (code) => {
  const res = await fetch(`${BASE_URL}/api/groups/invite/${code}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.group;
};

export const joinGroup = async (code) => {
  const res = await fetch(`${BASE_URL}/api/groups/invite/${code}/join`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
};

export const fetchGroupPins = async (groupId) => {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/pins`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.pins;
};

export const createGroupPin = async (groupId, { lat, lng, title }) => {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/pins`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ lat, lng, title }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.pin;
};

export const generateTripSummary = async (groupId) => {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/summary`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.summary;
};
