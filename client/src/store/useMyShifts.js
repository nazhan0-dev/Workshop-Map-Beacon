// เวรของ รปภ. ที่ล็อกอินอยู่ (ใช้ร่วมกันระหว่างหน้าเวรของฉันกับหน้าแผนที่)
import { create } from "zustand";
import { api } from "../lib/api";
import { today } from "../lib/shifts";

const useMyShifts = create((set) => ({
  items: null,
  error: "",
  load: async () => {
    try {
      const items = await api.get("/me/assignments", { from: today(), days: 14 });
      set({ items, error: "" });
    } catch (e) {
      set({ error: e.response?.data?.message || "โหลดเวรไม่สำเร็จ" });
    }
  },
  // เข้ากะ / ออกกะ: อัปเดตเวรนั้นในรายการทันที
  checkIn: async (id, body) => {
    const r = await api.post(`/me/assignments/${id}/check-in`, body);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...r } : i)) }));
    return r;
  },
  checkOut: async (id) => {
    const r = await api.post(`/me/assignments/${id}/check-out`);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...r } : i)) }));
    return r;
  },
  ack: async (id) => {
    const r = await api.post(`/me/assignments/${id}/ack`);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, acknowledged_at: r.acknowledged_at } : i)) }));
  },
}));

export default useMyShifts;
