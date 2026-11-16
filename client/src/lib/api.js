import axios from "axios";

// ตั้งค่าใน client/.env  ->  VITE_API_URL=http://localhost:5000/api
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "wm_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const client = axios.create({ baseURL: API_URL });

// แนบ token ทุกคำขอ
client.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// token หมดอายุ -> กลับไปหน้าเข้าสู่ระบบ
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      tokenStore.clear();
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const api = {
  get: (path, params) => client.get(path, { params }).then((r) => r.data),
  post: (path, body) => client.post(path, body).then((r) => r.data),
  put: (path, body) => client.put(path, body).then((r) => r.data),
  patch: (path, body) => client.patch(path, body).then((r) => r.data),
  del: (path) => client.delete(path).then((r) => r.data),
};

// ข้อความ error จาก server (หรือข้อความสำรอง)
export function errMsg(err, fallback = "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง") {
  if (!err.response) return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่ารัน server อยู่";
  return err.response.data?.message || fallback;
}
