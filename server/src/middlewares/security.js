// ความปลอดภัยพื้นฐานของ API: header, กันคำขอข้ามเว็บ (CSRF), จำกัดการเดารหัสผ่าน
import { COOKIE_NAME, readCookie } from "./auth.js";

// ต้นทางเว็บที่อนุญาต (คั่นด้วยจุลภาคได้ เช่น http://localhost:5173,http://192.168.1.10:5173)
export const ALLOWED_ORIGINS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

export function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cache-Control": "no-store",
  });
  next();
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(req) {
  if (req.headers.origin) return req.headers.origin.replace(/\/$/, "");
  try { return new URL(req.headers.referer).origin; } catch { return null; }
}

// คำขอที่แก้ข้อมูลผ่าน cookie (และการล็อกอิน) ถ้ามาจากเบราว์เซอร์ ต้องมาจากหน้าเว็บของเราเท่านั้น
// - เบราว์เซอร์ส่ง Origin มากับคำขอแบบนี้เสมอ เว็บอื่นจึงปลอมไม่ได้ (ทำงานคู่กับ cookie SameSite=Lax)
// - ไม่มี Origin/Referer = ไม่ได้มาจากเบราว์เซอร์ (เช่น curl, Postman) ให้ผ่าน
// - ใช้ Bearer token ไม่ต้องเช็ก เพราะเว็บอื่นแนบ header นี้แทนเราไม่ได้
export function csrfGuard(req, res, next) {
  if (SAFE.has(req.method) || req.headers.authorization) return next();
  if (!readCookie(req, COOKIE_NAME) && !req.path.endsWith("/auth/login")) return next();
  const origin = originOf(req);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ message: "คำขอนี้ไม่ได้มาจากหน้าเว็บของระบบ", code: "BAD_ORIGIN" });
  }
  next();
}

/**
 * จำกัดการล็อกอินผิด: ชื่อผู้ใช้เดียวกันจากที่อยู่เดียวกัน ผิดได้ 5 ครั้งต่อ 15 นาที
 * และที่อยู่เดียวกันผิดรวมได้ 30 ครั้งต่อ 15 นาที (เก็บในหน่วยความจำ ใช้กับ server ตัวเดียว)
 */
const WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LIMITS = { perUser: Number(process.env.LOGIN_MAX_TRIES || 5), perIp: 30 };
const fails = new Map(); // key -> { n, until }

function hit(key) {
  const now = Date.now();
  const e = fails.get(key);
  if (!e || e.until < now) { fails.set(key, { n: 1, until: now + WINDOW_MS }); return 1; }
  e.n += 1;
  return e.n;
}
function blockedFor(key, max) {
  const e = fails.get(key);
  if (!e || e.until < Date.now() || e.n < max) return 0;
  return Math.ceil((e.until - Date.now()) / 1000);
}

export const loginLimiter = {
  check(ip, username) {
    return Math.max(
      blockedFor(`u:${ip}:${username}`, LOGIN_LIMITS.perUser),
      blockedFor(`ip:${ip}`, LOGIN_LIMITS.perIp)
    );
  },
  fail(ip, username) { hit(`u:${ip}:${username}`); hit(`ip:${ip}`); },
  success(ip, username) { fails.delete(`u:${ip}:${username}`); },
};
// ล้างรายการที่หมดเวลาแล้วทุก 10 นาที
setInterval(() => { const now = Date.now(); for (const [k, v] of fails) if (v.until < now) fails.delete(k); }, 600000).unref();
