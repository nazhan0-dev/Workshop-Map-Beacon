import { create } from "zustand";

// แจ้งเตือนสั้นๆ มุมจอ: toast("บันทึกแล้ว") หรือ toast("ผิดพลาด", "error")
const useToast = create((set) => ({
  items: [],
  push: (text, type = "ok") => {
    // ไม่แสดงข้อความว่าง และไม่แสดงข้อความเดิมซ้ำขณะที่ยังค้างอยู่ (เช่น หลายคำขอผิดพร้อมกัน)
    if (!text || useToast.getState().items.some((i) => i.text === text)) return;
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ items: [...s.items, { id, text, type }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 3200);
  },
}));

export const toast = (text, type) => useToast.getState().push(text, type);
export default useToast;
