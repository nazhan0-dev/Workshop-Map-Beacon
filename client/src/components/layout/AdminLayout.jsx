import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Map, LayoutGrid, Users, MapPin, LogOut, ShieldCheck, Siren, CalendarOff } from "lucide-react";
import { BeaconAppIcon } from "../Logo";
import useAuthStore from "../../store/useAuthStore";
import useIncidentSummary from "../../store/useIncidentSummary";
import useLeaveSummary from "../../store/useLeaveSummary";
import usePolling from "../../lib/usePolling";
import { initials } from "../../lib/shifts";

const NAV = [
  { to: "/admin/assign", label: "จัดเวร", icon: Map },
  { to: "/admin/dashboard", label: "ภาพรวม", icon: LayoutGrid },
  { to: "/admin/staff", label: "พนักงาน", icon: Users },
  { to: "/admin/locations", label: "จุดเวร", icon: MapPin },
  { to: "/admin/incidents", label: "รายงาน", icon: Siren, badge: "incidents" },
  { to: "/admin/leaves", label: "การลา", icon: CalendarOff, badge: "leaves" },
];

// ตัวเลขบนเมนู: รายงานค้าง (แดงเมื่อมีเรื่องด่วน) / คำขอลารออนุมัติ
function NavBadge({ kind, className = "" }) {
  const inc = useIncidentSummary();
  const pendingLeaves = useLeaveSummary((s) => s.pending);
  const n = kind === "leaves" ? pendingLeaves : inc.open;
  const hot = kind === "incidents" && inc.urgent > 0;
  if (!n) return null;
  return (
    <span className={`absolute min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white ${hot ? "bg-danger text-white inc-pulse" : "bg-warn text-white"} ${className}`}
      aria-label={kind === "leaves" ? `คำขอลารออนุมัติ ${n}` : `รายงานค้าง ${n} เรื่อง`}>{n > 99 ? "99+" : n}</span>
  );
}

// หาตำแหน่งเมนูที่เลือกอยู่ เพื่อเลื่อนแถบไฮไลต์ไปวางตรงนั้น
function useIndicator(axis) {
  const { pathname } = useLocation();
  const refs = useRef([]);
  const [pos, setPos] = useState(null);
  const active = NAV.findIndex((n) => pathname.startsWith(n.to));

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[active];
      setPos(el ? (axis === "y" ? el.offsetTop : el.offsetLeft + el.offsetWidth / 2) : null);
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, axis]);

  return { refs, pos, active };
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate("/login"); };
  const [meOpen, setMeOpen] = useState(false);
  const meBox = useRef(null);

  // การ์ดบัญชี: ปิดเมื่อคลิกข้างนอก / Esc
  useEffect(() => {
    if (!meOpen) return;
    const onDown = (e) => { if (!meBox.current?.contains(e.target)) setMeOpen(false); };
    const onKey = (e) => e.key === "Escape" && setMeOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [meOpen]);
  usePolling(() => { useIncidentSummary.getState().refresh(); useLeaveSummary.getState().refresh(); }, 30000);
  const side = useIndicator("y");
  const bottom = useIndicator("x");

  return (
    <div className="h-dvh flex md:p-4 md:gap-3">
      {/* แถบเมนูซ้าย (จอใหญ่) */}
      <aside className="hidden md:flex surface relative w-[84px] shrink-0 flex-col items-center py-4">
        <span title="Beacon" className="nav-in" style={{ animationDelay: "0s" }}><BeaconAppIcon size={44} /></span>
        <div className="w-9 h-px bg-line mt-4 mb-3" />

        {/* ไฮไลต์ที่เลื่อนตามเมนูที่เลือก: พื้นดำหลังไอคอน + แถบเขียวด้านซ้าย */}
        {side.pos != null && (
          <>
            <span className="nav-pill absolute left-1/2 -translate-x-1/2 w-11 h-11 rounded-[13px] bg-ink shadow-[0_6px_16px_rgb(23_25_28/0.25)]"
              style={{ top: side.pos }} />
            <span className="nav-pill absolute left-0 w-[3px] h-5 rounded-r bg-brand" style={{ top: side.pos + 12 }} />
          </>
        )}

        <nav className="flex flex-col items-center gap-2">
          {NAV.map(({ to, label, icon, badge }, i) => { const Icon = icon; return (
            <NavLink key={to} to={to} ref={(el) => (side.refs.current[i] = el)}
              className="nav-in group relative z-10 flex flex-col items-center gap-1 w-[72px] outline-offset-4 rounded-xl"
              style={{ animationDelay: `${0.06 + i * 0.05}s` }}>
              {({ isActive }) => (
                <>
                  <span className={`w-11 h-11 rounded-[13px] border flex items-center justify-center transition-all duration-200
                    ${isActive ? "border-transparent text-white" : "border-line text-ink group-hover:bg-paper group-hover:-translate-y-0.5"}`}>
                    <Icon size={19} key={isActive ? "on" : "off"} className={isActive ? "nav-bounce" : ""} />
                  </span>
                  {badge && <NavBadge kind={badge} className="top-[-4px] right-[6px]" />}
                  <span className={`text-[11px] font-semibold leading-tight transition-colors ${isActive ? "text-ink" : "text-faint group-hover:text-ink"}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ); })}
        </nav>

        <div className="flex-1" />

        <button onClick={onLogout} className="nav-in group flex flex-col items-center gap-1 w-[72px] mb-3" style={{ animationDelay: "0.3s" }}>
          <span className="w-11 h-11 rounded-[13px] border border-line flex items-center justify-center transition-all duration-200
            group-hover:bg-danger-soft group-hover:border-danger-soft group-hover:text-danger">
            <LogOut size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
          <span className="text-[11px] font-semibold text-faint transition-colors group-hover:text-danger">ออกจากระบบ</span>
        </button>
        {/* z-index ต้องอยู่ที่ตัวห่อ: อนิเมชัน nav-in ใช้ transform ทำให้ z ของการ์ดด้านในไม่มีผลข้ามเนื้อหาหน้า */}
        <div ref={meBox} className="nav-in relative z-[1200]" style={{ animationDelay: "0.35s" }}>
          <button onClick={() => setMeOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={meOpen} aria-label={`บัญชีของ ${user?.name || ""}`}
            className={`group relative w-11 h-11 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center transition-all duration-200
              hover:scale-105 ${meOpen ? "ring-[3px] ring-ink/15" : "hover:ring-[3px] hover:ring-ink/10"}`}>
            {initials(user?.name)}
            <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-brand text-white flex items-center justify-center ring-2 ring-white">
              <ShieldCheck size={10} />
            </span>
          </button>

          {meOpen && (
            <div role="dialog" aria-label="บัญชีของฉัน"
              className="me-pop absolute left-[calc(100%+14px)] bottom-0 z-[1200] w-64 bg-white rounded-2xl border border-line shadow-[0_16px_40px_-12px_rgb(23_25_28/0.3)] p-3">
              <div className="flex items-center gap-3 p-1">
                <span className="w-11 h-11 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center shrink-0">{initials(user?.name)}</span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{user?.name}</div>
                  <div className="text-xs text-mute truncate">@{user?.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 mx-1 text-xs font-semibold text-brand bg-brand-soft rounded-lg px-2.5 py-1.5">
                <ShieldCheck size={13} />สิทธิ์ผู้ดูแลระบบ
              </div>
              <div className="border-t border-line mt-3 pt-2 flex flex-col">
                <button onClick={() => { setMeOpen(false); navigate("/admin/staff"); }}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm hover:bg-paper text-left">
                  <Users size={16} className="text-mute" />จัดการบัญชีพนักงาน
                </button>
                <button onClick={onLogout} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-danger hover:bg-danger-soft text-left">
                  <LogOut size={16} />ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pb-[76px] md:pb-0">
        <Outlet />
      </main>

      {/* เมนูล่าง (มือถือ) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-white border-t border-line flex justify-around pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {bottom.pos != null && (
          <span className="nav-pill absolute top-2 w-10 h-10 -translate-x-1/2 rounded-[13px] bg-ink" style={{ left: bottom.pos }} />
        )}
        {NAV.map(({ to, label, icon, badge }, i) => { const Icon = icon; return (
          <NavLink key={to} to={to} ref={(el) => (bottom.refs.current[i] = el)}
            className="relative z-10 flex flex-col items-center gap-0.5 text-[11px] font-semibold">
            {({ isActive }) => (
              <>
                <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center transition-colors ${isActive ? "text-white" : "text-faint"}`}>
                  <Icon size={21} key={isActive ? "on" : "off"} className={isActive ? "nav-bounce" : ""} />
                </span>
                {badge && <NavBadge kind={badge} className="-top-1 -right-1" />}
                <span className={`transition-colors ${isActive ? "text-ink" : "text-faint"}`}>{label}</span>
              </>
            )}
          </NavLink>
        ); })}
      </nav>
    </div>
  );
}
