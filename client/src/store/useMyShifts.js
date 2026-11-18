// เวรของ รปภ. ที่ล็อกอินอยู่ (ใช้ร่วมกันระหว่างหน้าเวรของฉันกับหน้าแผนที่)
import { create } from "zustand";
import { api } from "../lib/api";
import { today, addDays, shiftTiming } from "../lib/shifts";

const useMyShifts = create((set) => ({
  items: null,
  error: "",
  load: async () => {
    try {
      // โหลดตั้งแต่เมื่อวาน เพื่อให้เห็นกะดึกเมื่อคืนที่ยังไม่จบ (หลังเที่ยงคืนยังต้องเข้ากะ/ออกกะ/รายงานได้)
      const y = addDays(today(), -1);
      const rows = await api.get("/me/assignments", { from: y, days: 15 });
      const items = rows.filter((i) => i.date !== y || (i.shift === "NIGHT" && !shiftTiming(i).ended));
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
