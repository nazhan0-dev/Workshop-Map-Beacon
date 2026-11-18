// ทดสอบ API ทุกเส้น (รันกับฐานข้อมูลตัวอย่างที่เพิ่งสร้างใหม่ เพราะเทสต์จะเพิ่ม/ลบข้อมูลจริง)
//   1) สร้างฐานข้อมูลใหม่จาก sql/setup-workbench.sql
//   2) รัน server:  npm run dev
//   3) อีกหน้าต่าง:  npm test
// ใช้ API_URL=http://... ถ้า server ไม่ได้อยู่ที่ localhost:5000
import { test } from "node:test";
import assert from "node:assert/strict";

const API = process.env.API_URL || "http://localhost:5000/api";
const pad = (n) => String(n).padStart(2, "0");
const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const TODAY = day(0), TMR = day(1);
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8+/r/fwAJ0gPzxj5iYwAAAABJRU5ErkJggg==";

const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// เรียก API แบบเบราว์เซอร์: แนบ cookie ของผู้ใช้ และ Origin ของหน้าเว็บ
// opts.token = cookie "beacon_token=..." (ได้จาก login) | opts.origin = null คือไม่ส่ง Origin
async function call(method, path, { token, body, raw, origin = ORIGIN, headers = {} } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body !== undefined || raw ? { "content-type": "application/json" } : {}),
      ...(token ? { cookie: token } : {}),
      ...(origin ? { origin } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, body: data, headers: res.headers };
}
const get = (p, token) => call("GET", p, { token });
const post = (p, body, token) => call("POST", p, { body, token });
const put = (p, body, token) => call("PUT", p, { body, token });
const patch = (p, body, token) => call("PATCH", p, { body, token });
const del = (p, token) => call("DELETE", p, { token });

// ดึง cookie ที่ server ตั้งให้ ("beacon_token=...") จาก Set-Cookie
const setCookies = (r) => r.headers.getSetCookie?.() || [];
function cookieFrom(r) {
  const c = setCookies(r).find((x) => x.startsWith("beacon_token="));
  return c ? c.split(";")[0] : null;
}
// บัญชีตัวอย่างใช้อีเมล @beacon.com (บัญชีที่เทสต์สร้างเองใช้ชื่อสั้น)
const SEED = new Set(["admin", "nas", "nif", "ar", "yanee", "ris", "nasreen", "nis"]);
const email = (u) => (SEED.has(u) ? `${u}@beacon.com` : u);
async function login(username, password = "123456") {
  const r = await post("/auth/login", { username: email(username), password });
  assert.equal(r.status, 200, `login ${username}: ${JSON.stringify(r.body)}`);
  const c = cookieFrom(r);
  assert.ok(c, "ต้องได้ cookie กลับมา");
  return c;
}

// ผู้ใช้ตัวอย่าง (id ตามลำดับใน seed)
const ID = { admin: 1, nas: 2, nif: 3, ar: 4, yanee: 5, ris: 6, nasreen: 7, nis: 8 };
const T = {};
const S = {}; // ค่าที่ส่งต่อระหว่างเทสต์

test("health + route ที่ไม่มีจริง", async () => {
  assert.deepEqual((await get("/health")).body, { ok: true, db: true });
  assert.equal((await get("/nope")).status, 404);
});

test("auth: login / me / เปลี่ยนรหัสผ่าน", async () => {
  assert.equal((await post("/auth/login", {})).status, 400);
  assert.equal((await post("/auth/login", { username: "admin@beacon.com", password: "ผิด" })).status, 401);
  for (const u of Object.keys(ID)) T[u] = await login(u, u === "admin" ? "admin1234" : "123456");

  const lr = await post("/auth/login", { username: "nas@beacon.com", password: "123456" });
  assert.equal(lr.body.user.rank, "HEAD");
  assert.equal(lr.body.user.password_hash, undefined, "ต้องไม่ส่ง hash กลับ");
  assert.equal(lr.body.user.token_version, undefined);
  assert.equal(lr.body.token, undefined, "token อยู่ใน cookie เท่านั้น ไม่ส่งใน body");
  assert.equal((await post("/auth/login", { username: "NAS@Beacon.com", password: "123456" })).status, 200, "ชื่อผู้ใช้ไม่สนตัวพิมพ์เล็กใหญ่");

  assert.equal((await get("/auth/me")).status, 401);
  assert.equal((await get("/auth/me", "beacon_token=not-a-token")).status, 401);
  const me = await get("/auth/me", T.nif);
  assert.equal(me.status, 200);
  assert.equal(me.body.rank, "DEPUTY");

  assert.equal((await put("/auth/password", { currentPassword: "123456", newPassword: "123" }, T.yanee)).status, 400);
  assert.equal((await put("/auth/password", { currentPassword: "ผิด", newPassword: "abcdef" }, T.yanee)).status, 400);
  const old = T.yanee;
  const ch = await put("/auth/password", { currentPassword: "123456", newPassword: "abcdef" }, T.yanee);
  assert.equal(ch.status, 200);
  T.yanee = cookieFrom(ch);
  assert.ok(T.yanee, "เครื่องที่เปลี่ยนรหัสต้องได้ cookie ใหม่");
  assert.equal((await get("/auth/me", old)).status, 401, "cookie เก่าต้องใช้ไม่ได้หลังเปลี่ยนรหัส");
  assert.equal((await get("/auth/me", T.yanee)).status, 200);
  await login("yanee", "abcdef");
  const back = await put("/auth/password", { currentPassword: "abcdef", newPassword: "123456" }, T.yanee);
  assert.equal(back.status, 200);
  T.yanee = cookieFrom(back);
});

test("สิทธิ์: รปภ. เรียก API ของ admin ไม่ได้", async () => {
  for (const p of ["/users", `/assignments?date=${TODAY}`, `/dashboard?date=${TODAY}`, "/incidents", "/leaves"]) {
    assert.equal((await get(p, T.ar)).status, 403, p);
  }
  assert.equal((await post("/locations", { name: "x", lat: 13, lng: 100 }, T.ar)).status, 403);
});

test("locations: ดู / เพิ่ม / แก้ / ลบ", async () => {
  const list = await get("/locations", T.ar);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 5);

  assert.equal((await post("/locations", { name: "", lat: 13, lng: 100 }, T.admin)).status, 400);
  assert.equal((await post("/locations", { name: "x", lat: 200, lng: 100 }, T.admin)).status, 400);
  assert.equal((await post("/locations", { name: "x", lat: 13, lng: 100, need_morning: 99 }, T.admin)).status, 400);

  const c = await post("/locations", { name: "จุดทดสอบ", lat: 13.75, lng: 100.5, need_morning: 1, need_afternoon: 0, need_night: 1, contact_phone: "02-000-0000" }, T.admin);
  assert.equal(c.status, 201);
  assert.equal(c.body.need_afternoon, 0);
  S.loc = c.body.id;

  const u = await put(`/locations/${S.loc}`, { name: "จุดทดสอบ 2", lat: 13.76, lng: 100.51, need_morning: 2 }, T.admin);
  assert.equal(u.status, 200);
  assert.equal(u.body.name, "จุดทดสอบ 2");
  assert.equal((await put("/locations/9999", { name: "x", lat: 1, lng: 1 }, T.admin)).status, 404);
});

test("users: รายชื่อ / เพิ่ม / แก้ / รีเซ็ตรหัส / ลบ", async () => {
  const list = await get("/users", T.admin);
  assert.equal(list.status, 200);
  const users = list.body.filter((u) => u.role === "USER");
  assert.equal(users[0].rank, "HEAD", "หัวหน้าต้องขึ้นก่อน");
  assert.ok(list.body.every((u) => !("password_hash" in u)));

  assert.equal((await post("/users", { name: "ก", username: "ก", password: "123456" }, T.admin)).status, 400);
  assert.equal((await post("/users", { name: "ก", username: "new1", password: "123" }, T.admin)).status, 400);
  assert.equal((await post("/users", { name: "ซ้ำ", username: "ar@beacon.com", password: "123456" }, T.admin)).status, 409);

  const c = await post("/users", { name: "ทดสอบ ระบบ", username: "tester", password: "123456", rank: "DEPUTY", phone: "089" }, T.admin);
  assert.equal(c.status, 201);
  assert.equal(c.body.rank, "DEPUTY");
  assert.equal(c.body.role, "USER");
  S.user = c.body.id;

  const bad = await post("/users", { name: "x y", username: "rankbad", password: "123456", rank: "BOSS" }, T.admin);
  assert.equal(bad.body.rank, "STAFF", "rank แปลก ๆ ต้องกลายเป็น STAFF");
  await del(`/users/${bad.body.id}`, T.admin);

  const u = await put(`/users/${S.user}`, { name: "ทดสอบ แก้", username: "tester", rank: "HEAD" }, T.admin);
  assert.equal(u.status, 200);
  assert.equal(u.body.rank, "HEAD");
  assert.equal((await put("/users/9999", { name: "x", username: "xxx" }, T.admin)).status, 404);
  assert.equal((await put(`/users/${ID.admin}`, { name: "a", username: "admin@beacon.com", role: "USER" }, T.admin)).status, 400, "ลดสิทธิ์ตัวเองไม่ได้");

  assert.equal((await post(`/users/${S.user}/reset-password`, { password: "1" }, T.admin)).status, 400);
  assert.equal((await post(`/users/${S.user}/reset-password`, { password: "newpass" }, T.admin)).status, 200);
  await login("tester", "newpass");
  assert.equal((await post("/users/9999/reset-password", { password: "123456" }, T.admin)).status, 404);

  assert.equal((await del(`/users/${ID.admin}`, T.admin)).status, 400, "ลบตัวเองไม่ได้");
  assert.equal((await del(`/users/${S.user}`, T.admin)).status, 200);
  assert.equal((await del(`/users/${S.user}`, T.admin)).status, 404);
});

test("assignments: ดู / จัด / กันซ้ำ / จุดเต็ม / เวรต่อกัน / ย้าย / ถอน", async () => {
  assert.equal((await get("/assignments", T.admin)).status, 400);
  assert.equal((await get(`/assignments?date=${TODAY}&shift=LUNCH`, T.admin)).status, 400);
  const morning = await get(`/assignments?date=${TODAY}&shift=MORNING`, T.admin);
  assert.equal(morning.status, 200);
  assert.equal(morning.body.length, 5);
  assert.ok(["HEAD", "DEPUTY"].includes(morning.body[0].user_rank), "เรียงหัวหน้าก่อน");

  assert.equal((await post("/assignments", { userId: ID.yanee, locationId: 1, date: "17/11", shift: "MORNING" }, T.admin)).status, 400);
  assert.equal((await post("/assignments", { userId: 9999, locationId: 1, date: TODAY, shift: "MORNING" }, T.admin)).status, 404);
  assert.equal((await post("/assignments", { userId: ID.yanee, locationId: 9999, date: TODAY, shift: "MORNING" }, T.admin)).status, 404);

  const dupe = await post("/assignments", { userId: ID.nas, locationId: 4, date: TODAY, shift: "MORNING" }, T.admin);
  assert.equal(dupe.status, 409); assert.equal(dupe.body.code, "ALREADY_ASSIGNED");

  const full = await post("/assignments", { userId: ID.yanee, locationId: 1, date: TODAY, shift: "MORNING" }, T.admin);
  assert.equal(full.status, 409); assert.equal(full.body.code, "FULL");

  // สุดามีกะบ่ายวันนี้ จัดกะเช้าเพิ่ม = ทำงานต่อกัน
  const b2b = await post("/assignments", { userId: ID.yanee, locationId: 4, date: TODAY, shift: "MORNING" }, T.admin);
  assert.equal(b2b.status, 409); assert.equal(b2b.body.code, "BACK_TO_BACK");
  assert.equal(b2b.body.conflicts[0].shift, "AFTERNOON");
  const forced = await post("/assignments", { userId: ID.yanee, locationId: 4, date: TODAY, shift: "MORNING", force: true }, T.admin);
  assert.equal(forced.status, 201);
  S.asg = forced.body.id;

  assert.equal((await patch(`/assignments/${S.asg}`, { locationId: 1 }, T.admin)).status, 409, "ย้ายไปจุดที่เต็ม");
  const mv = await patch(`/assignments/${S.asg}`, { locationId: S.loc }, T.admin);
  assert.equal(mv.status, 200); assert.equal(mv.body.location_id, S.loc);
  assert.equal((await patch("/assignments/9999", { locationId: 1 }, T.admin)).status, 404);

  assert.equal((await del(`/assignments/${S.asg}`, T.admin)).status, 200);
  assert.equal((await del(`/assignments/${S.asg}`, T.admin)).status, 404);
});

test("assignments/copy: วัน / สัปดาห์ / ไม่มีต้นทาง", async () => {
  assert.equal((await post("/assignments/copy", { mode: "day", from: TODAY, to: TODAY }, T.admin)).status, 400);
  assert.equal((await post("/assignments/copy", { mode: "day", from: "x", to: TODAY }, T.admin)).status, 400);
  const d = await post("/assignments/copy", { mode: "day", from: TODAY, to: day(10) }, T.admin);
  assert.equal(d.status, 200); assert.ok(d.body.copied >= 7, JSON.stringify(d.body));
  const again = await post("/assignments/copy", { mode: "day", from: TODAY, to: day(10) }, T.admin);
  assert.equal(again.body.copied, 0, "รอบสองต้องข้ามทั้งหมด");
  const empty = await post("/assignments/copy", { mode: "day", from: day(-30), to: day(20) }, T.admin);
  assert.match(empty.body.message, /ไม่มีเวร/);
  const w = await post("/assignments/copy", { mode: "week", from: day(7), to: day(14) }, T.admin);
  assert.equal(w.status, 200);
});

test("dashboard", async () => {
  assert.equal((await get("/dashboard", T.admin)).status, 400);
  const r = await get(`/dashboard?date=${TODAY}`, T.admin);
  assert.equal(r.status, 200);
  for (const k of ["totals", "perShift", "understaffed", "freeStaff", "acknowledgements", "incidents", "leaves", "pendingLeaves"]) assert.ok(k in r.body, k);
  assert.equal(r.body.perShift.length, 3);
});

test("me: เวรของฉัน / รับทราบ", async () => {
  const r = await get("/me/assignments", T.ar);
  assert.equal(r.status, 200);
  const mine = r.body.find((a) => a.date === TODAY && a.shift === "MORNING");
  assert.ok(mine, "วิชัยต้องมีเวรเช้าวันนี้");
  assert.equal(mine.teammates[0].name, "นิส");
  assert.equal(mine.teammates[0].rank, "HEAD");
  S.wichaiAsg = mine.id;

  const ack = await post(`/me/assignments/${mine.id}/ack`, undefined, T.ar);
  assert.equal(ack.status, 200); assert.ok(ack.body.acknowledged_at);
  assert.equal((await post(`/me/assignments/${mine.id}/ack`, undefined, T.nasreen)).status, 404, "รับทราบเวรของคนอื่นไม่ได้");
});

test("incidents: รปภ. รายงาน / หัวหน้ารับเรื่อง", async () => {
  assert.equal((await post("/me/incidents", { assignmentId: S.wichaiAsg, detail: "  " }, T.ar)).status, 400);
  assert.equal((await post("/me/incidents", { assignmentId: S.wichaiAsg, detail: "x", photo: "data:text/html;base64,AAAA" }, T.ar)).status, 400);
  assert.equal((await post("/me/incidents", { assignmentId: S.wichaiAsg, detail: "x" }, T.nasreen)).status, 400, "รายงานด้วยเวรของคนอื่นไม่ได้");

  const r = await post("/me/incidents", { assignmentId: S.wichaiAsg, level: "URGENT", detail: "มีคนปีนรั้ว", photo: PNG }, T.ar);
  assert.equal(r.status, 201); assert.equal(r.body.status, "OPEN"); assert.equal(r.body.has_photo, true);
  S.inc = r.body.id;
  const r2 = await post("/me/incidents", { assignmentId: S.wichaiAsg, level: "WEIRD", detail: "ไฟดับ" }, T.ar);
  assert.equal(r2.body.level, "NORMAL", "level แปลก ๆ ต้องเป็น NORMAL");
  S.inc2 = r2.body.id;

  const mine = await get("/me/incidents", T.ar);
  assert.equal(mine.body.mine.length, 2); assert.equal(mine.body.isLeader, false);

  const lead = await get("/me/incidents", T.nis);
  assert.equal(lead.body.isLeader, true);
  assert.ok(lead.body.team.some((i) => i.id === S.inc));
  const other = await get("/me/incidents", T.nasreen);
  assert.equal(other.body.team.length, 0);

  assert.equal((await get(`/me/incidents/${S.inc}`, T.ar)).body.photo, PNG);
  assert.equal((await get(`/me/incidents/${S.inc}`, T.nasreen)).status, 403);
  assert.equal((await get(`/me/incidents/${S.inc}`, T.nif)).status, 200, "รองหัวหน้ากะเดียวกันดูได้");

  assert.equal((await patch(`/me/incidents/${S.inc}`, { status: "ACK" }, T.ar)).status, 403);
  assert.equal((await patch(`/me/incidents/${S.inc}`, { status: "DONE" }, T.nis)).status, 400);
  const ack = await patch(`/me/incidents/${S.inc}`, { status: "ACK" }, T.nis);
  assert.equal(ack.status, 200); assert.equal(ack.body.status, "ACK"); assert.equal(ack.body.handled_by_name, "นิส");
});

test("incidents: admin ดู / กรอง / สรุป / ปิดเรื่อง", async () => {
  const open = await get("/incidents", T.admin);
  assert.equal(open.body.length, 2);
  assert.equal(open.body[0].level, "URGENT", "เรื่องด่วนขึ้นก่อน");
  assert.equal(open.body[0].photo, undefined, "รายการต้องไม่มีรูป");
  assert.equal((await get("/incidents?level=URGENT", T.admin)).body.length, 1);
  assert.equal((await get(`/incidents?status=all&date=${TODAY}`, T.admin)).body.length, 2);

  const sum = await get("/incidents/summary", T.admin);
  assert.deepEqual({ open: sum.body.open, urgent: sum.body.urgent }, { open: 2, urgent: 1 });
  assert.equal(sum.body.byLocation[3].open, 2);

  assert.equal((await get(`/incidents/${S.inc}`, T.admin)).body.photo, PNG);
  assert.equal((await get("/incidents/9999", T.admin)).status, 404);
  assert.equal((await patch(`/incidents/${S.inc}`, {}, T.admin)).status, 400);
  const c = await patch(`/incidents/${S.inc}`, { status: "CLOSED", note: "ตรวจแล้ว" }, T.admin);
  assert.equal(c.body.status, "CLOSED"); assert.equal(c.body.close_note, "ตรวจแล้ว");
  assert.equal((await get("/incidents?status=closed", T.admin)).body.length, 1);
  assert.equal((await get("/incidents/summary", T.admin)).body.open, 1);
});

test("leaves: รปภ. แจ้งลา / ตรวจเงื่อนไข / ยกเลิก", async () => {
  const aff = await get(`/me/leaves/affected?start=${TODAY}&end=${TODAY}`, T.nasreen);
  assert.equal(aff.status, 200); assert.equal(aff.body.length, 1, "มาลีมีกะบ่ายวันนี้ 1 กะ");
  assert.equal((await get(`/me/leaves/affected?start=${TODAY}&end=${TODAY}&shifts=MORNING`, T.nasreen)).body.length, 0);

  assert.equal((await post("/me/leaves", { type: "NAP", start: TODAY, end: TODAY }, T.nasreen)).status, 400);
  assert.equal((await post("/me/leaves", { type: "SICK", start: day(-1), end: TODAY }, T.nasreen)).status, 400, "ลาย้อนหลังไม่ได้");
  assert.equal((await post("/me/leaves", { type: "SICK", start: TMR, end: TODAY }, T.nasreen)).status, 400);
  assert.equal((await post("/me/leaves", { type: "VACATION", start: TODAY, end: day(40) }, T.nasreen)).status, 400, "เกิน 31 วัน");

  // ลาป่วยวันนี้ = อนุมัติและถอนเวรทันที
  const sick = await post("/me/leaves", { type: "SICK", start: TODAY, end: TODAY, reason: "ไข้" }, T.nasreen);
  assert.equal(sick.status, 201); assert.equal(sick.body.status, "APPROVED"); assert.equal(sick.body.auto, true);
  assert.equal(sick.body.removed.length, 1);
  S.sick = sick.body.id;
  assert.equal((await get(`/assignments?date=${TODAY}&shift=AFTERNOON`, T.admin)).body.some((a) => a.user_id === ID.nasreen), false);
  assert.equal((await post("/me/leaves", { type: "SICK", start: TODAY, end: TODAY }, T.nasreen)).status, 409, "ลาซ้อน");

  // ลาเฉพาะบางกะ: กะไม่ทับกันส่งได้
  const am = await post("/me/leaves", { type: "VACATION", start: TMR, end: TMR, shifts: ["MORNING"] }, T.nif);
  assert.equal(am.status, 201); assert.equal(am.body.status, "PENDING"); assert.deepEqual(am.body.shifts, ["MORNING"]);
  S.amLeave = am.body.id;
  const pm = await post("/me/leaves", { type: "PERSONAL", start: TMR, end: TMR, shifts: ["AFTERNOON"] }, T.nif);
  assert.equal(pm.status, 201);
  S.pmLeave = pm.body.id;
  assert.equal((await post("/me/leaves", { type: "PERSONAL", start: TMR, end: TMR }, T.nif)).status, 409, "ทั้งวันทับกะที่ขอไว้");
  const all3 = await post("/me/leaves", { type: "PERSONAL", start: day(5), end: day(5), shifts: ["MORNING", "AFTERNOON", "NIGHT"] }, T.nif);
  assert.equal(all3.body.shifts, null, "เลือกครบ 3 กะ = ทั้งวัน");

  const mine = await get("/me/leaves", T.nif);
  assert.equal(mine.body.length, 3);
  assert.equal((await del(`/me/leaves/${all3.body.id}`, T.nif)).status, 200);
  assert.equal((await del(`/me/leaves/${S.sick}`, T.nasreen)).status, 409, "ยกเลิกลาที่อนุมัติแล้วไม่ได้");
  assert.equal((await del(`/me/leaves/${S.amLeave}`, T.nasreen)).status, 409, "ยกเลิกของคนอื่นไม่ได้");
});

test("leaves: admin อนุมัติ / ไม่อนุมัติ / หาคนแทน / กันจัดคนลา", async () => {
  const pending = await get("/leaves", T.admin);
  assert.equal(pending.body.length, 2);
  assert.equal((await get("/leaves?status=all", T.admin)).body.length, 4);
  assert.equal((await get("/leaves/summary", T.admin)).body.pending, 2);

  assert.equal((await get("/leaves/on", T.admin)).status, 400);
  const on = await get(`/leaves/on?date=${TMR}`, T.admin);
  assert.equal(on.body.filter((l) => l.user_id === ID.nif).length, 2);

  const detail = await get(`/leaves/${S.amLeave}`, T.admin);
  assert.equal(detail.body.affected.length, 1, "สมหญิงมีเวรเช้าพรุ่งนี้ 1 กะ");
  assert.equal((await get("/leaves/9999", T.admin)).status, 404);

  assert.equal((await patch(`/leaves/${S.amLeave}`, { status: "MAYBE" }, T.admin)).status, 400);
  const ok = await patch(`/leaves/${S.amLeave}`, { status: "APPROVED" }, T.admin);
  assert.equal(ok.status, 200); assert.equal(ok.body.status, "APPROVED");
  assert.equal(ok.body.removed.length, 1); assert.ok(ok.body.removed[0].count < ok.body.removed[0].need, "จุดนั้นต้องกลายเป็นขาดคน");
  assert.equal((await patch(`/leaves/${S.amLeave}`, { status: "REJECTED" }, T.admin)).status, 409, "ตัดสินซ้ำไม่ได้");
  const no = await patch(`/leaves/${S.pmLeave}`, { status: "REJECTED", note: "คนไม่พอ" }, T.admin);
  assert.equal(no.body.status, "REJECTED"); assert.equal(no.body.decide_note, "คนไม่พอ");

  const back = await post("/assignments", { userId: ID.nif, locationId: 1, date: TMR, shift: "MORNING", force: true }, T.admin);
  assert.equal(back.status, 409); assert.equal(back.body.code, "ON_LEAVE");

  assert.equal((await get("/leaves/suggest?date=x&shift=MORNING", T.admin)).status, 400);
  const sug = await get(`/leaves/suggest?date=${TMR}&shift=MORNING`, T.admin);
  assert.equal(sug.status, 200);
  assert.ok(sug.body.length > 0);
  assert.ok(!sug.body.some((u) => u.id === ID.nif), "คนลาต้องไม่อยู่ในคนแนะนำ");
  const flags = sug.body.map((u) => u.back_to_back);
  assert.deepEqual(flags, [...flags].sort(), "คนไม่ติดเวรต่อกันต้องขึ้นก่อน");

  const pick = sug.body[0];
  const fill = await post("/assignments", { userId: pick.id, locationId: 1, date: TMR, shift: "MORNING", force: true }, T.admin);
  assert.equal(fill.status, 201);
  const after = await get(`/leaves/${S.amLeave}`, T.admin);
  assert.deepEqual(after.body.removed[0].replaced_by, [pick.name]);

  const dash = await get(`/dashboard?date=${TODAY}`, T.admin);
  assert.ok(dash.body.leaves.some((l) => l.user_id === ID.nasreen));
  assert.ok(!dash.body.freeStaff.some((u) => u.id === ID.nasreen), "คนลาไม่นับเป็นคนว่าง");

  const cp = await post("/assignments/copy", { mode: "day", from: TODAY, to: day(30) }, T.admin);
  assert.equal(cp.status, 200);
});

test("check-in: เข้ากะ / ออกกะ / ระยะ / เวลา / หัวหน้าดูทีม", async () => {
  // กะที่กำลังเป็นอยู่ตอนนี้ (กะดึกหลังเที่ยงคืนนับเป็นของเมื่อวาน)
  const h = new Date().getHours();
  const cur = h < 6 ? { date: day(-1), shift: "NIGHT" } : h < 14 ? { date: TODAY, shift: "MORNING" } : h < 22 ? { date: TODAY, shift: "AFTERNOON" } : { date: TODAY, shift: "NIGHT" };

  assert.equal((await put(`/locations/${S.loc}`, { name: "จุดทดสอบ 2", lat: 13.76, lng: 100.51, checkin_radius: 5 }, T.admin)).status, 400);
  const loc = await put(`/locations/${S.loc}`, { name: "จุดทดสอบ 2", lat: 13.76, lng: 100.51, need_morning: 2, need_afternoon: 2, need_night: 2, checkin_radius: 150 }, T.admin);
  assert.equal(loc.body.checkin_radius, 150);

  const u = await post("/users", { name: "เข้ากะ ทดสอบ", username: "checker", password: "123456" }, T.admin);
  const tc = await login("checker");
  const a = await post("/assignments", { userId: u.body.id, locationId: S.loc, ...cur, force: true }, T.admin);
  assert.equal(a.status, 201);
  const later = await post("/assignments", { userId: u.body.id, locationId: S.loc, date: day(3), shift: "MORNING", force: true }, T.admin);

  const mine = await get(`/me/assignments?from=${cur.date}&days=5`, tc);
  const row = mine.body.find((x) => x.id === a.body.id);
  assert.equal(row.checkin_radius, 150);
  assert.ok(["WAITING", "MISSING"].includes(row.attendance), row.attendance);

  assert.equal((await post(`/me/assignments/${later.body.id}/check-in`, { lat: 13.76, lng: 100.51 }, tc)).body.code, "TOO_EARLY");
  assert.equal((await post(`/me/assignments/${a.body.id}/check-in`, { lat: 13.76, lng: 100.51 }, T.ar)).status, 404, "เข้ากะแทนคนอื่นไม่ได้");
  assert.equal((await post(`/me/assignments/${a.body.id}/check-out`, undefined, tc)).status, 400, "ยังไม่เข้ากะ ออกไม่ได้");
  const nopos = await post(`/me/assignments/${a.body.id}/check-in`, {}, tc);
  if (nopos.status === 400) assert.equal(nopos.body.code, "NO_LOCATION"); // CHECKIN_GPS=off จะผ่านเลย
  else { assert.equal(nopos.status, 200); }

  if (nopos.status === 400) {
    const far = await post(`/me/assignments/${a.body.id}/check-in`, { lat: 13.70, lng: 100.51, accuracy: 30 }, tc);
    assert.equal(far.body.code, "TOO_FAR"); assert.ok(far.body.distance > 5000);
    // ห่าง ~200 ม. แต่ GPS คลาดเคลื่อน 60 ม. -> ยังนับว่าอยู่ในระยะ 150 ม.
    const ok = await post(`/me/assignments/${a.body.id}/check-in`, { lat: 13.7618, lng: 100.51, accuracy: 60 }, tc);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.ok(ok.body.check_in_distance >= 190 && ok.body.check_in_distance <= 210);
    assert.ok(["ON_TIME", "LATE"].includes(ok.body.attendance));
    assert.ok(ok.body.acknowledged_at, "เข้ากะแล้วนับว่ารับทราบด้วย");
  }
  assert.equal((await post(`/me/assignments/${a.body.id}/check-in`, { lat: 13.76, lng: 100.51 }, tc)).status, 409);

  const list = await get(`/assignments?date=${cur.date}&shift=${cur.shift}`, T.admin);
  const adm = list.body.find((x) => x.id === a.body.id);
  assert.ok(["ON_TIME", "LATE"].includes(adm.attendance)); assert.equal(adm.check_in_photo, undefined);
  assert.equal((await get(`/assignments/${a.body.id}/check-in-photo`, T.admin)).status, 404);

  const dash = await get(`/dashboard?date=${cur.date}`, T.admin);
  assert.equal(dash.body.attendance.perShift.length, 3);
  assert.ok(dash.body.acknowledgements.every((x) => "attendance" in x));

  const out = await post(`/me/assignments/${a.body.id}/check-out`, undefined, tc);
  assert.equal(out.status, 200); assert.ok(out.body.check_out_at);
  assert.equal((await post(`/me/assignments/${a.body.id}/check-out`, undefined, tc)).status, 409);

  // ย้ายจุด = ต้องเข้ากะใหม่
  const other = await post("/locations", { name: "จุดย้าย", lat: 13.7, lng: 100.4, need_morning: 2, need_afternoon: 2, need_night: 2 }, T.admin);
  const mv = await patch(`/assignments/${a.body.id}`, { locationId: other.body.id }, T.admin);
  assert.equal(mv.body.check_in_at, null);
  await del(`/locations/${other.body.id}`, T.admin);

  assert.deepEqual((await get("/me/team", tc)).body, { isLeader: false, slots: [] });
  const team = await get("/me/team", T.nis);
  assert.equal(team.body.isLeader, true);
  assert.ok(Array.isArray(team.body.slots));

  await del(`/users/${u.body.id}`, T.admin);
});

test("security: cookie / ยกเลิก token / CSRF / CORS / header", async () => {
  // cookie ที่ได้ต้องอ่านจาก JavaScript ไม่ได้ และส่งเฉพาะคำขอ /api
  const r = await post("/auth/login", { username: "ris@beacon.com", password: "123456" });
  const raw = setCookies(r).find((x) => x.startsWith("beacon_token="));
  assert.match(raw, /HttpOnly/i); assert.match(raw, /SameSite=Lax/i); assert.match(raw, /Path=\/api/i);
  assert.match(raw, /Max-Age=\d+/i);
  const cookie = raw.split(";")[0];
  const jwtStr = cookie.slice("beacon_token=".length);

  // ใช้ token แบบ Bearer ได้ด้วย (สำหรับเครื่องมือ/แอปอื่น)
  assert.equal((await call("GET", "/auth/me", { headers: { authorization: `Bearer ${jwtStr}` } })).status, 200);

  // token ถูกแก้ / เซ็นด้วยกุญแจอื่น / alg none -> ใช้ไม่ได้ และ server สั่งลบ cookie
  const [h, p, sig] = jwtStr.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ id: ID.admin, tv: 0, exp: 9999999999 })).toString("base64url");
  const bad = await get("/auth/me", `beacon_token=${h}.${forgedPayload}.${sig}`);
  assert.equal(bad.status, 401);
  assert.ok(setCookies(bad).some((c) => /beacon_token=;/.test(c)), "ต้องสั่งลบ cookie ที่ใช้ไม่ได้");
  const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  assert.equal((await get("/auth/me", `beacon_token=${none}.${forgedPayload}.`)).status, 401);
  assert.equal((await get("/users", `beacon_token=${h}.${forgedPayload}.${sig}`)).status, 401, "ปลอมเป็น admin ไม่ได้");

  // logout: ลบ cookie
  const out = await call("POST", "/auth/logout", { token: cookie });
  assert.equal(out.status, 200);
  assert.ok(setCookies(out).some((c) => /beacon_token=;/.test(c) && /Expires=Thu, 01 Jan 1970/i.test(c)));

  // ออกจากระบบทุกอุปกรณ์: cookie อื่นของคนนี้ใช้ไม่ได้ทันที
  const phone = await login("ris"), pc = await login("ris");
  assert.equal((await post("/auth/logout-all", undefined, phone)).status, 200);
  assert.equal((await get("/auth/me", pc)).status, 401);
  T.ris = await login("ris");

  // admin รีเซ็ตรหัส -> คนนั้นถูกออกจากระบบ
  const u = await post("/users", { name: "ชั่วคราว ทดสอบ", username: "temp1", password: "123456" }, T.admin);
  const tc = await login("temp1");
  await post(`/users/${u.body.id}/reset-password`, { password: "654321" }, T.admin);
  assert.equal((await get("/auth/me", tc)).status, 401, "รีเซ็ตรหัสแล้ว cookie เก่าต้องใช้ไม่ได้");
  // ลบบัญชี -> cookie ใช้ไม่ได้ทันที
  const tc2 = await login("temp1", "654321");
  await del(`/users/${u.body.id}`, T.admin);
  assert.equal((await get("/me/assignments", tc2)).status, 401, "บัญชีถูกลบแล้วต้องใช้ต่อไม่ได้");

  // ลดสิทธิ์ admin คนอื่น -> มีผลทันที ไม่ต้องรอ token หมดอายุ
  const a2 = await post("/users", { name: "แอดมิน สอง", username: "admin2", password: "123456", role: "ADMIN" }, T.admin);
  const ta2 = await login("admin2");
  assert.equal((await get("/users", ta2)).status, 200);
  await put(`/users/${a2.body.id}`, { name: "แอดมิน สอง", username: "admin2", role: "USER" }, T.admin);
  assert.equal((await get("/users", ta2)).status, 403);
  await del(`/users/${a2.body.id}`, T.admin);

  // CSRF: คำขอที่ใช้ cookie จากเว็บอื่นถูกปฏิเสธ
  const evil = await call("POST", "/locations", { token: T.admin, body: { name: "x", lat: 1, lng: 1 }, origin: "https://evil.example" });
  assert.equal(evil.status, 403); assert.equal(evil.body.code, "BAD_ORIGIN");
  assert.equal((await call("POST", "/auth/login", { body: { username: "admin@beacon.com", password: "admin1234" }, origin: "https://evil.example" })).status, 403);
  assert.equal((await call("DELETE", "/users/9999", { token: T.admin, headers: { referer: "https://evil.example/page" }, origin: null })).status, 403, "เช็กจาก Referer ด้วย");
  // ไม่มี Origin (curl/Postman) หรือใช้ Bearer -> ผ่านด่าน CSRF
  assert.equal((await call("DELETE", "/users/9999", { token: T.admin, origin: null })).status, 404);
  const tA = T.admin.slice("beacon_token=".length);
  assert.equal((await call("DELETE", "/users/9999", { headers: { authorization: `Bearer ${tA}` }, origin: "https://evil.example" })).status, 404);
  // GET จากเว็บอื่นไม่ถูกบล็อกที่ server แต่เบราว์เซอร์อ่านผลไม่ได้เพราะ CORS
  const corsOk = await call("OPTIONS", "/users", { headers: { "access-control-request-method": "DELETE" } });
  assert.equal(corsOk.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(corsOk.headers.get("access-control-allow-credentials"), "true");
  const corsBad = await call("OPTIONS", "/users", { origin: "https://evil.example", headers: { "access-control-request-method": "DELETE" } });
  assert.equal(corsBad.headers.get("access-control-allow-origin"), null);

  // header ความปลอดภัย
  const hh = (await get("/health")).headers;
  assert.equal(hh.get("x-powered-by"), null);
  assert.equal(hh.get("x-content-type-options"), "nosniff");
  assert.equal(hh.get("x-frame-options"), "DENY");
  assert.equal(hh.get("cache-control"), "no-store");
});

test("security: เดารหัสผ่าน / injection / ข้อมูลผิดรูป", async () => {
  // ผิด 5 ครั้ง -> ครั้งที่ 6 ถูกพัก (แม้ใส่รหัสถูก) ส่วนคนอื่นไม่โดน (ใช้ชื่อใหม่ทุกรอบ เพราะตัวนับอยู่ในหน่วยความจำของ server)
  const victim = `rl${Date.now() % 1e9}`;
  const vu = await post("/users", { name: "ทดสอบ จำกัด", username: victim, password: "123456" }, T.admin);
  for (let i = 0; i < 5; i++) assert.equal((await post("/auth/login", { username: victim, password: "wrong" })).status, 401);
  const blocked = await post("/auth/login", { username: victim, password: "123456" });
  assert.equal(blocked.status, 429); assert.equal(blocked.body.code, "TOO_MANY_ATTEMPTS");
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal((await post("/auth/login", { username: "nis@beacon.com", password: "123456" })).status, 200);
  await del(`/users/${vu.body.id}`, T.admin);

  // body ไม่ใช่ JSON / ชนิดข้อมูลผิด
  assert.equal((await call("POST", "/auth/login", { raw: "{bad json" })).status, 400);
  assert.equal((await post("/auth/login", { username: ["admin"], password: { $ne: 1 } })).status, 400);

  // SQL injection: ใช้ placeholder ทุกที่ จึงไม่มีผล
  assert.equal((await post("/auth/login", { username: "admin@beacon.com' OR '1'='1", password: "' OR '1'='1" })).status, 401);
  assert.equal((await get(`/assignments?date=${encodeURIComponent("2026-01-01' OR 1=1 --")}`, T.admin)).status, 400);
  const inj = await post("/users", { name: "'); DROP TABLE users; --", username: "inj_test", password: "123456" }, T.admin);
  assert.equal(inj.status, 201); assert.equal(inj.body.name, "'); DROP TABLE users; --");
  assert.equal((await get("/users", T.admin)).status, 200, "ตาราง users ยังอยู่");
  // XSS: เก็บเป็นข้อความธรรมดา (หน้าเว็บ React แสดงเป็นตัวอักษร ไม่รันสคริปต์)
  const xss = await put(`/users/${inj.body.id}`, { name: "<img src=x onerror=alert(1)>", username: "inj_test" }, T.admin);
  assert.equal(xss.body.name, "<img src=x onerror=alert(1)>");
  await del(`/users/${inj.body.id}`, T.admin);

  // ข้อมูลยาว/ผิดรูปแบบ -> 400 (ไม่ใช่ 500)
  assert.equal((await post("/users", { name: "ก".repeat(101), username: "longname", password: "123456" }, T.admin)).status, 400);
  assert.equal((await post("/users", { name: "x y", username: "phone1", password: "123456", phone: "<script>" }, T.admin)).status, 400);
  assert.equal((await post("/users", { name: "x y", username: "pw1", password: "a".repeat(73) }, T.admin)).status, 400);
  assert.equal((await post("/locations", { name: "x", lat: "", lng: "" }, T.admin)).status, 400, "พิกัดว่างต้องไม่กลายเป็น 0,0");
  assert.equal((await post("/locations", { name: "x", lat: 13, lng: 100, contact_phone: "abc" }, T.admin)).status, 400);
  assert.equal((await post("/locations", { name: "ก".repeat(101), lat: 13, lng: 100 }, T.admin)).status, 400);

  // จัดเวรให้ admin ไม่ได้
  assert.equal((await post("/assignments", { userId: ID.admin, locationId: 4, date: day(40), shift: "MORNING" }, T.admin)).status, 400);
});

test("concurrency: กดพร้อมกันต้องไม่เกินจำนวนคน / อนุมัติลาซ้อน", async () => {
  const loc = await post("/locations", { name: "จุดแย่งกัน", lat: 13.7, lng: 100.5, need_morning: 1, need_afternoon: 1, need_night: 1 }, T.admin);
  const date = day(45);
  const users = [ID.nas, ID.nif, ID.ar, ID.yanee, ID.ris, ID.nasreen, ID.nis];
  const rs = await Promise.all(users.map((u) => post("/assignments", { userId: u, locationId: loc.body.id, date, shift: "NIGHT", force: true }, T.admin)));
  const codes = rs.map((r) => r.status).sort();
  assert.equal(codes.filter((c) => c === 201).length, 1, `ต้องสำเร็จ 1 คนเท่านั้น ได้ ${codes}`);
  assert.ok(rs.filter((r) => r.status !== 201).every((r) => r.status === 409));
  assert.equal((await get(`/assignments?date=${date}&shift=NIGHT`, T.admin)).body.filter((a) => a.location_id === loc.body.id).length, 1);

  // คนเดียวกันถูกจัดพร้อมกัน 2 จุด -> ได้จุดเดียว
  const loc2 = await post("/locations", { name: "จุดแย่งกัน 2", lat: 13.7, lng: 100.5, need_morning: 3 }, T.admin);
  const loc3 = await post("/locations", { name: "จุดแย่งกัน 3", lat: 13.7, lng: 100.5, need_morning: 3 }, T.admin);
  const same = await Promise.all([loc2, loc3].map((l) => post("/assignments", { userId: ID.nis, locationId: l.body.id, date, shift: "MORNING", force: true }, T.admin)));
  assert.deepEqual(same.map((r) => r.status).sort(), [201, 409]);

  // อนุมัติลาพร้อมกัน 2 ครั้ง -> สำเร็จครั้งเดียว
  const lv = await post("/me/leaves", { type: "PERSONAL", start: day(44), end: day(46) }, T.nis);
  const two = await Promise.all([1, 2].map(() => patch(`/leaves/${lv.body.id}`, { status: "APPROVED" }, T.admin)));
  assert.deepEqual(two.map((r) => r.status).sort(), [200, 409]);
  const done = (await get(`/leaves/${lv.body.id}`, T.admin)).body;
  assert.equal(done.removed.length, 1, "ถอนเวรของธนาออก 1 กะ");

  for (const l of [loc, loc2, loc3]) await del(`/locations/${l.body.id}`, T.admin);
});

test("ไฟล์ใหญ่เกิน + ลบจุดทดสอบ", async () => {
  const big = await call("POST", "/me/incidents", { token: T.ar, raw: JSON.stringify({ detail: "x", photo: "a".repeat(4_000_000) }) });
  assert.equal(big.status, 413);
  assert.equal((await del(`/locations/${S.loc}`, T.admin)).status, 200);
  assert.equal((await del(`/locations/${S.loc}`, T.admin)).status, 404);
});
