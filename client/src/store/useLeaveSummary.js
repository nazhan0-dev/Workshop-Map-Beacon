// จำนวนคำขอลาที่รออนุมัติ (ตัวเลขบนเมนู admin)
import { create } from "zustand";
import { api } from "../lib/api";

const useLeaveSummary = create((set) => ({
  pending: 0,
  refresh: async () => {
    try { set(await api.get("/leaves/summary")); } catch { /* เงียบไว้ */ }
  },
}));

export default useLeaveSummary;
