import { create } from "zustand";
import { api, tokenStore } from "../lib/api";

const useAuthStore = create((set) => ({
  user: null,
  ready: false, // ตรวจ token เสร็จแล้วหรือยัง

  // เรียกตอนเปิดแอป: ถ้ามี token ให้ดึงข้อมูลผู้ใช้
  init: async () => {
    if (!tokenStore.get()) return set({ ready: true });
    try {
      const user = await api.get("/auth/me");
      set({ user, ready: true });
    } catch {
      tokenStore.clear();
      set({ user: null, ready: true });
    }
  },

  login: async (username, password) => {
    const { token, user } = await api.post("/auth/login", { username, password });
    tokenStore.set(token);
    set({ user });
    return user;
  },

  logout: () => {
    tokenStore.clear();
    set({ user: null });
  },
}));

export default useAuthStore;
