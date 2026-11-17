// การลา: ป้ายประเภท/สถานะ และตัวช่วยแสดงช่วงวัน
import { Thermometer, Briefcase, Palmtree } from "lucide-react";
import { SHIFT_INFO, parseDate } from "./shifts";

export const LEAVE_TYPES = {
  SICK: { label: "ลาป่วย", icon: Thermometer, chip: "bg-danger-soft text-danger" },
  PERSONAL: { label: "ลากิจ", icon: Briefcase, chip: "bg-[#e8eefc] text-[#2f55b5]" },
  VACATION: { label: "ลาพักร้อน", icon: Palmtree, chip: "bg-brand-soft text-brand" },
};
export const LEAVE_TYPE_KEYS = ["SICK", "PERSONAL", "VACATION"];

export const LEAVE_STATUS = {
  PENDING: { label: "รออนุมัติ", chip: "bg-warn-soft text-warn" },
  APPROVED: { label: "อนุมัติแล้ว", chip: "bg-brand-soft text-brand" },
  REJECTED: { label: "ไม่อนุมัติ", chip: "bg-danger-soft text-danger" },
  CANCELLED: { label: "ยกเลิกแล้ว", chip: "bg-paper text-mute" },
};

const short = (s, withYear) => parseDate(s).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "2-digit" } : {}) });

// "จ. 17 พ.ย." หรือ "จ. 17 – พ. 19 พ.ย." 
export function fmtRange(start, end) {
  if (start === end) return short(start);
  return `${short(start)} – ${short(end)}`;
}

export function dayCount(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / 864e5) + 1;
}

// null = ทั้งวัน
export const shiftsText = (shifts) => (!shifts ? "ทั้งวัน" : shifts.map((s) => `กะ${SHIFT_INFO[s].label}`).join(", "));

// ลานี้ครอบคลุมกะนี้ไหม (shifts null = ทุกกะ)
export const coversShift = (leave, shift) => !leave.shifts || leave.shifts.includes(shift);
