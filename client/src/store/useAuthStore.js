import { create } from "zustand";
import { api, setUnauthorizedHandler } from "../lib/api";

const useAuthStore = create((set) => ({
  user: null,
  ready: false, // ตรวจเซสชันเสร็จแล้วหรือยัง
  expired: false, // ถูกเด้งออกเพราะเซสชันหมดอายุ (หน้าเข้าสู่ระบบจะบอกผู้ใช้)

  // เรียกตอนเปิดแอป: ถามว่า cookie ยังใช้ได้ไหม
  init: async () => {
    try { localStorage.removeItem("wm_token"); } catch { /* token แบบเก่า ไม่ใช้แล้ว */ }
    try {
      const user = await api.get("/auth/me");
      set({ user, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  login: async (username, password) => {
    const { user } = await api.post("/auth/login", { username, password });
    set({ user, expired: false });
    return user;
  },

  // ล้างหน้าจอทันที แล้วบอก server ให้ลบ cookie
  logout: async () => {
    set({ user: null });
    try { await api.post("/auth/logout"); } catch { /* ออกฝั่งเครื่องแล้ว */ }
  },

  // ออกจากระบบทุกอุปกรณ์ (token ที่ออกไปแล้วใช้ไม่ได้ทั้งหมด)
  logoutAll: async () => {
    await api.post("/auth/logout-all");
    set({ user: null });
  },
}));

setUnauthorizedHandler(() => {
  if (useAuthStore.getState().user) useAuthStore.setState({ user: null, expired: true });
});

export default useAuthStore;
