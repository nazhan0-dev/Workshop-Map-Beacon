import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Map, LayoutGrid, Users, MapPin, LogOut } from "lucide-react";
import { BeaconAppIcon } from "../Logo";
import useAuthStore from "../../store/useAuthStore";
import { initials } from "../../lib/shifts";

const NAV = [
  { to: "/admin/assign", label: "จัดเวร", icon: Map },
  { to: "/admin/dashboard", label: "ภาพรวม", icon: LayoutGrid },
  { to: "/admin/staff", label: "พนักงาน", icon: Users },
  { to: "/admin/locations", label: "จุดเวร", icon: MapPin },
];

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
          {NAV.map(({ to, label, icon }, i) => { const Icon = icon; return (
            <NavLink key={to} to={to} ref={(el) => (side.refs.current[i] = el)}
              className="nav-in group relative z-10 flex flex-col items-center gap-1 w-[72px] outline-offset-4 rounded-xl"
              style={{ animationDelay: `${0.06 + i * 0.05}s` }}>
              {({ isActive }) => (
                <>
                  <span className={`w-11 h-11 rounded-[13px] border flex items-center justify-center transition-all duration-200
                    ${isActive ? "border-transparent text-white" : "border-line text-ink group-hover:bg-paper group-hover:-translate-y-0.5"}`}>
                    <Icon size={19} key={isActive ? "on" : "off"} className={isActive ? "nav-bounce" : ""} />
                  </span>
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
        <div title={user?.name} className="nav-in w-11 h-11 rounded-full bg-brand-soft text-brand font-semibold text-sm flex items-center justify-center"
          style={{ animationDelay: "0.35s" }}>
          {initials(user?.name)}
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
        {NAV.map(({ to, label, icon }, i) => { const Icon = icon; return (
          <NavLink key={to} to={to} ref={(el) => (bottom.refs.current[i] = el)}
            className="relative z-10 flex flex-col items-center gap-0.5 text-[11px] font-semibold">
            {({ isActive }) => (
              <>
                <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center transition-colors ${isActive ? "text-white" : "text-faint"}`}>
                  <Icon size={21} key={isActive ? "on" : "off"} className={isActive ? "nav-bounce" : ""} />
                </span>
                <span className={`transition-colors ${isActive ? "text-ink" : "text-faint"}`}>{label}</span>
              </>
            )}
          </NavLink>
        ); })}
      </nav>
    </div>
  );
}
