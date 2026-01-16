const API_URL = import.meta.env.VITE_API_URL;

export const apiFetch = async (path) => {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error("Error API");
  return res.json();
};
