// ทดสอบฟังก์ชันคำนวณ (ไม่ต้องเปิด server หรือฐานข้อมูล):  npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, adjacentShifts, toDateStr, isDateStr } from "../src/utils/shifts.js";
import { attendanceOf, shiftWindow, distanceM, toDateTimeStr, parseDateTime } from "../src/utils/attendance.js";
import { parseRange } from "../src/utils/leaves.js";
import { text, phone } from "../src/utils/validate.js";

const at = (s) => parseDateTime(s); // "YYYY-MM-DD HH:MM:SS" เวลาเครื่อง

test("addDays ข้ามเดือน ข้ามปี และปีอธิกสุรทิน", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(toDateStr(new Date(2026, 10, 5)), "2026-11-05");
  assert.ok(isDateStr("2026-11-18")); assert.ok(!isDateStr("18/11/2026")); assert.ok(!isDateStr(null));
});

test("adjacentShifts: กะที่ติดกัน รวมกะดึกข้ามวัน", () => {
  assert.deepEqual(adjacentShifts("2026-11-18", "MORNING"), [{ date: "2026-11-17", shift: "NIGHT" }, { date: "2026-11-18", shift: "AFTERNOON" }]);
  assert.deepEqual(adjacentShifts("2026-11-18", "NIGHT"), [{ date: "2026-11-18", shift: "AFTERNOON" }, { date: "2026-11-19", shift: "MORNING" }]);
});

test("shiftWindow: กะดึกจบเช้าวันถัดไป", () => {
  const { start, end } = shiftWindow("2026-11-18", "NIGHT");
  assert.equal(toDateTimeStr(start), "2026-11-18 22:00:00");
  assert.equal(toDateTimeStr(end), "2026-11-19 06:00:00");
});

test("attendanceOf: ทุกสถานะและเส้นแบ่งเวลา", () => {
  const a = { date: "2026-11-18", shift: "MORNING" };
  assert.equal(attendanceOf(a, at("2026-11-18 05:29:00")).attendance, "UPCOMING");
  assert.equal(attendanceOf(a, at("2026-11-18 05:30:00")).attendance, "WAITING", "เปิดให้กด 30 นาทีก่อนกะ");
  assert.equal(attendanceOf(a, at("2026-11-18 06:14:59")).attendance, "WAITING");
  const miss = attendanceOf(a, at("2026-11-18 06:15:00"));
  assert.equal(miss.attendance, "MISSING"); assert.equal(miss.late_minutes, 15);
  assert.equal(attendanceOf(a, at("2026-11-18 14:00:00")).attendance, "ABSENT");
  assert.equal(attendanceOf({ ...a, check_in_at: "2026-11-18 05:50:00" }).attendance, "ON_TIME");
  assert.equal(attendanceOf({ ...a, check_in_at: "2026-11-18 06:10:00" }).attendance, "ON_TIME", "สาย 10 นาทียังไม่นับ");
  const late = attendanceOf({ ...a, check_in_at: "2026-11-18 06:11:00" });
  assert.equal(late.attendance, "LATE"); assert.equal(late.late_minutes, 11);
  // กะดึก: ตีหนึ่งของวันถัดไปยังอยู่ในกะ
  const night = { date: "2026-11-18", shift: "NIGHT" };
  assert.equal(attendanceOf(night, at("2026-11-19 01:00:00")).attendance, "MISSING");
  assert.equal(attendanceOf(night, at("2026-11-19 06:00:00")).attendance, "ABSENT");
});

test("distanceM: ระยะจริงโดยประมาณ", () => {
  assert.equal(distanceM(13.7563, 100.5018, 13.7563, 100.5018), 0);
  const d = distanceM(13.7563, 100.5018, 13.7653, 100.5018); // 0.009 องศา ≈ 1 กม.
  assert.ok(d > 990 && d < 1010, String(d));
});

test("parseRange: ตรวจช่วงวันลา", () => {
  assert.deepEqual(parseRange({ start: "2026-11-18", end: "2026-11-18", shifts: [] }), { start: "2026-11-18", end: "2026-11-18", shifts: null });
  assert.deepEqual(parseRange({ start: "2026-11-18", end: "2026-11-19", shifts: ["NIGHT", "NIGHT", "X"] }).shifts, ["NIGHT"]);
  assert.equal(parseRange({ start: "2026-11-18", end: "2026-11-18", shifts: ["MORNING", "AFTERNOON", "NIGHT"] }).shifts, null);
  assert.throws(() => parseRange({ start: "2026-11-19", end: "2026-11-18" }), /วันสุดท้าย/);
  assert.throws(() => parseRange({ start: "2026-11-01", end: "2026-12-02" }), /31 วัน/);
  assert.throws(() => parseRange({ start: "x", end: "2026-11-18" }), /เลือกวันที่/);
});

test("validate: ข้อความและเบอร์โทร", () => {
  assert.equal(text("  สมชาย  ", { label: "ชื่อ", max: 10 }), "สมชาย");
  assert.equal(text("", { label: "ชื่อ", max: 10 }), null);
  assert.throws(() => text("", { label: "ชื่อ", max: 10, required: true }), /กรอกชื่อ/);
  assert.throws(() => text("12345678901", { label: "ชื่อ", max: 10 }), /ไม่เกิน 10/);
  assert.equal(phone("081-234-5678"), "081-234-5678");
  assert.equal(phone("+66 (2) 123 4567"), "+66 (2) 123 4567");
  assert.throws(() => phone("<script>"), /ตัวเลข/);
});
