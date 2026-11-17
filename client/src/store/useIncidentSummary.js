// จำนวนรายงานที่ยังไม่ปิด (ฝั่ง admin) ใช้ที่ตัวเลขบนเมนูและเครื่องหมายบนหมุดแผนที่
import { create } from "zustand";
import { api } from "../lib/api";

const useIncidentSummary = create((set) => ({
  open: 0,
  urgent: 0,
  byLocation: {},
  refresh: async () => {
    try { set(await api.get("/incidents/summary")); } catch { /* เงียบไว้ ไม่รบกวนหน้าอื่น */ }
  },
}));

export default useIncidentSummary;
