import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, KeyRound, Eye, EyeOff, Check, X, ChevronDown, ChevronRight, Phone, Briefcase, ShieldCheck, CalendarOff, MonitorSmartphone } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { Button, inputCls } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import useMyShifts from "../../store/useMyShifts";
import RankBadge from "../../components/RankBadge";
import { avatarTone } from "../../lib/avatar";
import { initials } from "../../lib/shifts";

// ความแข็งแรงของรหัสผ่าน 0–4
function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return pw ? Math.max(1, s) : 0;
}
const STRENGTH = [
  null,
  { label: "อ่อน", color: "bg-danger", text: "text-danger" },
  { label: "พอใช้", color: "bg-warn", text: "text-warn" },
  { label: "ดี", color: "bg-brand", text: "text-brand" },
  { label: "แข็งแรงมาก", color: "bg-brand", text: "text-brand" },
];

function PwInput({ id, label, value, onChange, autoComplete, children }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block" htmlFor={id}>
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      <span className="group relative flex items-center">
        <input id={id} type={show ? "text" : "password"} className={`${inputCls} pr-11`} value={value} onChange={onChange} autoComplete={autoComplete} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          className="absolute right-2 w-8 h-8 rounded-lg text-faint hover:text-ink hover:bg-paper flex items-center justify-center">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {children}
    </label>
  );
}

export default function ProfilePage() {
  const { user, logout, logoutAll } = useAuthStore();
  const { items, load } = useMyShifts();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => { if (!items) load(); }, [items, load]);

  const st = strength(f.newPassword);
  const match = f.confirm ? f.confirm === f.newPassword : null;
  const valid = f.currentPassword && f.newPassword.length >= 6 && match;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setError("");
    setBusy(true);
    try {
      await api.put("/auth/password", { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast("เปลี่ยนรหัสผ่านแล้ว");
      setF({ currentPassword: "", newPassword: "", confirm: "" });
      setOpen(false);
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  const total = items?.length ?? null;
  const acked = items ? items.filter((i) => i.acknowledged_at).length : null;
  const pending = total != null ? total - acked : null;
  const isUser = user.role === "USER";
  const contact = [
    user.position && { icon: Briefcase, label: "หน้าที่", value: user.position },
    user.phone && { icon: Phone, label: "เบอร์โทร", value: <a href={`tel:${user.phone}`} className="hover:underline tabular-nums">{user.phone}</a> },
  ].filter(Boolean);
  const onLogout = () => { logout(); useMyShifts.setState({ items: null }); navigate("/login"); };
  const onLogoutAll = async () => {
    try { await logoutAll(); useMyShifts.setState({ items: null }); navigate("/login"); }
    catch (e) { toast(errMsg(e), "error"); }
  };

  const row = "flex items-center gap-3 px-4 py-3.5";
  const icon = "w-9 h-9 rounded-xl flex items-center justify-center shrink-0";

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-6 md:px-0 md:pt-0 flex flex-col gap-3 md:gap-4">
      {/* โปรไฟล์: รูปวงกลม + ชื่อ + ตัวเลขสรุป */}
      <section className="dash-rise bg-white rounded-[26px] overflow-hidden">
        <div className="px-5 pt-7 flex flex-col items-center text-center">
          <span className={`pop-in w-[88px] h-[88px] rounded-full flex items-center justify-center text-[28px] font-bold ${avatarTone(user.name)}`}>
            {initials(user.name)}
          </span>
          <h1 className="text-xl font-bold mt-3">{user.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-mute">
            <span>@{user.username}</span>
            {isUser ? <RankBadge rank={user.rank} /> : <span className="flex items-center gap-1 text-xs font-semibold text-brand"><ShieldCheck size={13} />ผู้ดูแลระบบ</span>}
          </div>
        </div>
        {isUser ? (
          <div className="grid grid-cols-3 mt-5 border-t border-line divide-x divide-line">
            {[
              { label: "เวรทั้งหมด", value: total, tone: "text-ink" },
              { label: "รับทราบแล้ว", value: acked, tone: "text-brand" },
              { label: "รอรับทราบ", value: pending, tone: pending ? "text-warn" : "text-ink" },
            ].map((s) => (
              <div key={s.label} className="py-3.5 text-center">
                <div key={s.value} className={`pop-in text-[22px] font-bold leading-none tabular-nums ${s.tone}`}>{s.value ?? "–"}</div>
                <div className="text-[11px] text-mute mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        ) : <div className="h-5" />}
      </section>

      {/* ข้อมูลติดต่อ */}
      {contact.length > 0 && (
        <section className="dash-rise bg-white rounded-[22px] overflow-hidden" style={{ animationDelay: "0.06s" }}>
          <h2 className="text-xs font-semibold text-mute px-4 pt-3.5">ข้อมูลติดต่อ</h2>
          <div className="divide-y divide-line">
            {contact.map((r) => (
              <div key={r.label} className={row}>
                <span className={`${icon} bg-paper text-mute`}><r.icon size={16} /></span>
                <span className="text-sm text-mute flex-1">{r.label}</span>
                <span className="text-sm font-semibold text-right">{r.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* การลา */}
      <section className="dash-rise bg-white rounded-[22px] overflow-hidden" style={{ animationDelay: "0.08s" }}>
        <Link to="/me/leaves" className={`${row} group hover:bg-paper/60 transition-colors`}>
          <span className={`${icon} bg-paper text-ink`}><CalendarOff size={16} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">การลา</span>
            <span className="block text-xs text-mute">แจ้งลาป่วย ลากิจ ลาพักร้อน และดูสถานะคำขอ</span>
          </span>
          <ChevronRight size={18} className="text-mute transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* บัญชี: เปลี่ยนรหัสผ่าน + ออกจากระบบ */}
      <section className="dash-rise bg-white rounded-[22px] overflow-hidden" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-xs font-semibold text-mute px-4 pt-3.5">บัญชี</h2>
        <div className="divide-y divide-line">
          <div>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
              className={`${row} w-full text-left hover:bg-paper/60 transition-colors`}>
              <span className={`${icon} bg-ink text-white`}><KeyRound size={16} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">เปลี่ยนรหัสผ่าน</span>
                <span className="block text-xs text-mute">แนะนำให้เปลี่ยนหลังได้รับรหัสจากผู้ดูแล</span>
              </span>
              <ChevronDown size={18} className={`text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <form onSubmit={submit} className="expand-in px-4 pb-5 flex flex-col gap-4 pt-1">
                <PwInput id="pw-cur" label="รหัสผ่านปัจจุบัน" value={f.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />

                <PwInput id="pw-new" label="รหัสผ่านใหม่" value={f.newPassword} onChange={set("newPassword")} autoComplete="new-password">
                  <span className="flex items-center gap-2 mt-2">
                    <span className="flex-1 grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <span key={n} className={`h-1.5 rounded-full transition-colors duration-300 ${n <= st ? STRENGTH[st].color : "bg-track"}`} />
                      ))}
                    </span>
                    <span className={`text-xs font-semibold w-20 text-right ${st ? STRENGTH[st].text : "text-faint"}`}>
                      {st ? STRENGTH[st].label : "อย่างน้อย 6 ตัว"}
                    </span>
                  </span>
                </PwInput>

                <PwInput id="pw-confirm" label="ยืนยันรหัสผ่านใหม่" value={f.confirm} onChange={set("confirm")} autoComplete="new-password">
                  {match != null && (
                    <span key={String(match)} className={`pop-in flex items-center gap-1 mt-1.5 text-xs font-semibold ${match ? "text-brand" : "text-danger"}`}>
                      {match ? <><Check size={13} />รหัสผ่านตรงกัน</> : <><X size={13} />รหัสผ่านไม่ตรงกัน</>}
                    </span>
                  )}
                </PwInput>

                {error && <p className="pop-in text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5" role="alert">{error}</p>}
                <Button variant="dark" type="submit" loading={busy} disabled={!valid} className="h-12 rounded-2xl">บันทึกรหัสผ่านใหม่</Button>
              </form>
            )}
          </div>

          <button type="button" onClick={onLogout} className={`${row} group w-full text-left hover:bg-danger-soft/60 transition-colors`}>
            <span className={`${icon} bg-danger-soft text-danger`}><LogOut size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
            <span className="flex-1 text-sm font-semibold text-danger">ออกจากระบบ</span>
          </button>
          <button type="button" onClick={onLogoutAll} className={`${row} group w-full text-left border-t border-line hover:bg-paper/60 transition-colors`}>
            <span className={`${icon} bg-paper text-mute`}><MonitorSmartphone size={16} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold">ออกจากระบบทุกอุปกรณ์</span>
              <span className="block text-xs text-mute">ใช้เมื่อทำมือถือหายหรือเคยล็อกอินเครื่องคนอื่น</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
