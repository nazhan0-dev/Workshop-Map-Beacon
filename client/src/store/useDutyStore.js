// ข้อมูลหน้าจัดเวรของ Admin
import { create } from "zustand";
import { api } from "../lib/api";
import { today } from "../lib/shifts";

const useDutyStore = create((set, get) => ({
  date: today(),
  shift: "MORNING",
  locations: [],
  staff: [], // เฉพาะ role USER
  assignments: [], // ของวันที่ + กะที่เลือก
  selectedId: null, // จุดที่เลือกอยู่
  loading: false,

  setDate: (date) => { set({ date }); get().fetchAssignments(); },
  setShift: (shift) => { set({ shift }); get().fetchAssignments(); },
  select: (selectedId) => set({ selectedId }),

  fetchBase: async () => {
    const [locations, users] = await Promise.all([api.get("/locations"), api.get("/users")]);
    set({ locations, staff: users.filter((u) => u.role === "USER") });
  },

  fetchAssignments: async () => {
    const { date, shift } = get();
    set({ loading: true });
    try {
      const assignments = await api.get("/assignments", { date, shift });
      // กันข้อมูลเก่าทับ ถ้าผู้ใช้เปลี่ยนวัน/กะระหว่างรอ
      if (get().date === date && get().shift === shift) set({ assignments });
    } finally {
      set({ loading: false });
    }
  },

  // จัดคนเข้าจุด  (force = ยืนยันแล้วแม้เป็นเวรต่อกัน)
  assign: async (userId, locationId, force = false) => {
    const { date, shift } = get();
    await api.post("/assignments", { userId, locationId, date, shift, force });
    await get().fetchAssignments();
  },

  move: async (assignmentId, locationId) => {
    await api.patch(`/assignments/${assignmentId}`, { locationId });
    await get().fetchAssignments();
  },

  remove: async (assignmentId) => {
    await api.del(`/assignments/${assignmentId}`);
    await get().fetchAssignments();
  },

  copy: async (mode, from, to) => {
    const r = await api.post("/assignments/copy", { mode, from, to });
    await get().fetchAssignments();
    return r;
  },

  addLocation: async (data) => {
    const loc = await api.post("/locations", data);
    set((s) => ({ locations: [...s.locations, loc], selectedId: loc.id }));
    return loc;
  },
}));

export default useDutyStore;
