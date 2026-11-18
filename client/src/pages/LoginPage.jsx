import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import { User, Lock, ArrowRight, AlertCircle, MapPinned, Users, BellRing, ShieldCheck, Shield } from "lucide-react";
import { BeaconAppIcon } from "../components/Logo";
import useAuthStore from "../store/useAuthStore";
import { errMsg } from "../lib/api";

// หมุดตัวอย่างบนแผนที่ (ตำแหน่งเป็น % ของแถบว่างระหว่างโลโก้กับหัวข้อ)
const PINS = [
  { x: 16, y: 35, label: "2/2", s: "ok" },
  { x: 46, y: 10, label: "1/2", s: "low" },
  { x: 80, y: 42, label: "2/2", s: "ok", main: true },
  { x: 33, y: 80, label: "0/1", s: "empty" },
  { x: 60, y: 78, label: "3/3", s: "ok" },
];
const PIN_COLOR = { ok: "#2e9e68", low: "#d4862a", empty: "#d64c43" };

const FEATURES = [
  { icon: MapPinned, text: "จัดสรรกำลังพลลงจุดเวรบนแผนที่" },
  { icon: Users, text: "ติดตามอัตรากำลังของแต่ละจุดและแต่ละกะ" },
  { icon: BellRing, text: "แจ้งตารางเวรถึงเจ้าหน้าที่โดยตรง" },
];

// แผนที่จริงโทนเข้ม (เลื่อนช้า ๆ) + หมุดจุดเวรแบบเดียวกับในแอป
function MapScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="login-map absolute inset-[-8%]">
        <MapContainer center={[13.7632, 100.5068]} zoom={16} className="h-full w-full"
          zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false}
          doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_18_20/0.55)_0%,rgb(16_18_20/0.15)_35%,rgb(16_18_20/0.75)_62%,rgb(16_18_20/0.97)_100%)]" />
      <div className="absolute inset-x-6 top-[42%] h-[42%] md:inset-x-10 md:top-[24%] md:h-[22%]">
        {PINS.map((p, i) => (
          <div key={i} className={`login-mpin${p.main ? " main" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${0.5 + i * 0.18}s`, "--c": PIN_COLOR[p.s] }}>
            <span className="login-mpin-c"><Shield size={p.main ? 18 : 15} strokeWidth={2.2} /><i /></span>
            <span className="login-mpin-l"><b />{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// แผงฝั่งซ้าย: พื้นดำ + ฉากประภาคาร + ชื่อระบบแบบทางการ
function WelcomePanel() {
  return (
    <section className="relative overflow-hidden bg-ink text-white h-[220px] md:h-auto shrink-0">
      <MapScene />
      <div className="relative z-10 p-6 md:p-10 h-full flex flex-col pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="rounded-[12px] shadow-[0_6px_18px_rgb(0_0_0/0.35)]"><BeaconAppIcon size={42} radius={12} /></span>
          <div className="leading-tight">
            <div className="font-brand font-bold tracking-tight">Beacon</div>
            <div className="text-[11px] text-white/50 tracking-wide">Security Duty Management System</div>
          </div>
        </div>

        <div className="mt-auto hidden md:block">
          <h2 className="text-[26px] leading-snug font-bold">ระบบบริหารจัดการ<br />เวรรักษาความปลอดภัย</h2>
          <div className="w-10 h-[3px] rounded-full bg-[#3ec482] mt-4" />
          <ul className="mt-5 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-white/75">
                <f.icon size={16} className="text-[#3ec482] shrink-0" />{f.text}
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 mt-7 pt-4 flex items-center justify-between text-[11px] text-white/40">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><ShieldCheck size={13} />เฉพาะผู้ได้รับอนุญาต</span>
            <span className="whitespace-nowrap">© {new Date().getFullYear()} Beacon · แผนที่ © OpenStreetMap</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  const { user, login, expired } = useAuthStore();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  // ถูกเด้งออกเพราะเซสชันหมดอายุหรือถูกยกเลิก (เช่น เปลี่ยนรหัสจากอีกเครื่อง) -> บอกเหตุผล
  const [error, setError] = useState(() => (expired ? "เซสชันหมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบใหม่" : ""));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [caps, setCaps] = useState(false);
  const [forgot, setForgot] = useState(false);

  // ระหว่างกดเข้าสู่ระบบ ให้อยู่หน้านี้ก่อน เพื่อโชว์ปุ่ม "สำเร็จ" แล้วค่อยไป
  if (user && !busy && !done) return <Navigate to={user.role === "ADMIN" ? "/admin/assign" : "/me"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(username.trim(), password);
      setDone(true);
      setTimeout(() => navigate(u.role === "ADMIN" ? "/admin/assign" : "/me", { replace: true }), 900);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
      const f = formRef.current; // เล่นอนิเมชันสั่นใหม่ทุกครั้งที่ผิด
      if (f) { f.classList.remove("login-shake"); void f.offsetWidth; f.classList.add("login-shake"); }
    }
  };

  const checkCaps = (e) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  const rise = (i) => ({ style: { animationDelay: `${0.2 + i * 0.07}s` } });
  const box =
    "group flex items-center gap-3 h-[50px] rounded-xl bg-paper px-4 border border-transparent transition " +
    "focus-within:border-brand focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgb(46_158_104/0.12)]";
  const icon = "text-faint transition group-focus-within:text-brand shrink-0";

  return (
    <div className="login-bg min-h-dvh flex md:items-center md:justify-center md:p-8">
      <div className="login-card w-full md:max-w-[920px] md:min-h-[560px] bg-white md:rounded-[28px] overflow-hidden flex flex-col md:grid md:grid-cols-2">
        <WelcomePanel />

        <section className="relative z-10 -mt-6 md:mt-0 flex-1 bg-white rounded-t-[28px] md:rounded-none flex items-start md:items-center justify-center px-7 py-9 md:px-12">
          <form onSubmit={submit} ref={formRef} className="w-full max-w-[340px] flex flex-col">
            <h1 {...rise(0)} className="login-rise text-[28px] font-bold">เข้าสู่ระบบ</h1>
            <p {...rise(1)} className="login-rise text-sm text-mute mt-1">สำหรับเจ้าหน้าที่และผู้ดูแลระบบที่ได้รับสิทธิ์</p>

            <div {...rise(2)} className="login-rise mt-8">
              <label className="block text-[13px] font-semibold mb-1.5" htmlFor="u">ชื่อผู้ใช้</label>
              <div className={box}>
                <User size={18} className={icon} />
                <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="กรอกชื่อผู้ใช้"
                  autoComplete="username" autoCapitalize="none" autoFocus
                  className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" required />
              </div>
            </div>

            <div {...rise(3)} className="login-rise mt-4">
              <label className="block text-[13px] font-semibold mb-1.5" htmlFor="p">รหัสผ่าน</label>
              <div className={box}>
                <Lock size={18} className={icon} />
                <input id="p" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={checkCaps} onKeyDown={checkCaps} onBlur={() => setCaps(false)} placeholder="กรอกรหัสผ่าน"
                  autoComplete="current-password" className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" required />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="text-xs font-bold tracking-wide text-brand hover:text-ink transition"
                  aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                  {show ? "ซ่อน" : "แสดง"}
                </button>
              </div>
            </div>

            <div {...rise(4)} className="login-rise flex items-center justify-between mt-3 text-[13px] min-h-5">
              <span className="text-warn font-medium">{caps && <span className="login-pop inline-block">Caps Lock เปิดอยู่</span>}</span>
              <button type="button" onClick={() => setForgot((v) => !v)} className="text-mute hover:text-ink font-medium">
                ลืมรหัสผ่าน?
              </button>
            </div>
            {forgot && (
              <p className="login-pop text-[13px] text-mute bg-paper rounded-xl px-3.5 py-2.5 mt-2.5">
                ติดต่อหัวหน้าเวรหรือผู้ดูแลระบบ เพื่อรีเซ็ตรหัสผ่าน
              </p>
            )}

            {error && (
              <p className="login-pop flex items-center gap-2 text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5 mt-3" role="alert">
                <AlertCircle size={16} className="shrink-0" />{error}
              </p>
            )}

            <div {...rise(5)} className="login-rise mt-6">
              <button type="submit" disabled={busy}
                className={`login-btn group relative w-full h-[50px] rounded-xl text-[15px] font-semibold text-white overflow-hidden transition-all duration-300
                  disabled:cursor-default bg-ink ${done ? "" : "hover:bg-black active:scale-[0.99]"}`}>
                {done && <span className="login-progress" />}
                <span className="relative z-10 flex items-center justify-center gap-2.5">
                  {done ? (
                    <>
                      <span className="login-tick">
                        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                      เข้าสู่ระบบสำเร็จ
                    </>
                  )
                    : busy ? <><span className="login-dots"><i /><i /><i /></span>กำลังตรวจสอบ</>
                    : <>เข้าสู่ระบบ<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
                </span>
              </button>
            </div>

            <p {...rise(6)} className="login-rise text-xs text-faint text-center mt-8 pt-5 border-t border-line">
              พบปัญหาการเข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
