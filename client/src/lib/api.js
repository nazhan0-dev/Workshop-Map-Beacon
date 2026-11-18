import axios from "axios";

// ตั้งค่าใน client/.env  ->  VITE_API_URL=http://localhost:5000/api
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// token อยู่ใน cookie แบบ httpOnly ที่ server ตั้งให้ JavaScript อ่านไม่ได้ (กันขโมยผ่าน XSS)
// withCredentials = ให้เบราว์เซอร์แนบ cookie ไปกับทุกคำขอ
const client = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000 });

// เซสชันหมดอายุ/ถูกยกเลิก -> แจ้ง store ให้ล้างผู้ใช้ (หน้าเว็บจะพาไปหน้าเข้าสู่ระบบเอง)
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/me")) onUnauthorized();
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
// เซสชันหมด (401) คืนค่าว่าง: หน้าเข้าสู่ระบบบอกเหตุผลให้แล้ว ไม่ต้องเด้ง toast ซ้ำ
export function errMsg(err, fallback = "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง") {
  if (!err.response) return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่ารัน server อยู่";
  if (err.response.status === 401 && !err.config?.url?.includes("/auth/")) return "";
  return err.response.data?.message || fallback;
}
