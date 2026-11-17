import { NavLink, Outlet } from "react-router-dom";
import { Home, Map, User, Siren } from "lucide-react";
import { BeaconAppIcon } from "../Logo";

const NAV = [
  { to: "/me", label: "เวรของฉัน", icon: Home, end: true },
  { to: "/me/map", label: "แผนที่", icon: Map },
  { to: "/me/reports", label: "รายงาน", icon: Siren },
  { to: "/me/profile", label: "โปรไฟล์", icon: User },
];

// ฝั่ง รปภ.
// มือถือ: เมนูด้านล่าง / iPad-แท็บเล็ต (md ขึ้นไป): เมนูด้านซ้าย เนื้อหาเต็มจอ
export default function UserLayout() {
  return (
    <div className="min-h-dvh bg-paper md:flex md:p-4 md:gap-3">
      {/* เมนูซ้าย (แท็บเล็ต/จอใหญ่) */}
      <aside className="hidden md:flex surface w-[84px] shrink-0 flex-col items-center py-4 gap-2 sticky top-4 h-[calc(100dvh-32px)]">
        <span title="Beacon" className="nav-in mb-1"><BeaconAppIcon size={44} /></span>
        <div className="w-9 h-px bg-line mb-2" />
        {NAV.map(({ to, label, icon, end }, i) => { const Icon = icon; return (
          <NavLink key={to} to={to} end={end} className="nav-in group flex flex-col items-center gap-1 w-[72px]" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
            {({ isActive }) => (
              <>
                <span className={`w-11 h-11 rounded-[13px] border flex items-center justify-center transition-all duration-200
                  ${isActive ? "bg-ink border-ink text-white shadow-[0_6px_16px_rgb(23_25_28/0.25)]" : "border-line text-ink group-hover:bg-paper group-hover:-translate-y-0.5"}`}>
                  <Icon size={19} key={isActive ? "on" : "off"} className={isActive ? "nav-bounce" : ""} />
                </span>
                <span className={`text-[11px] font-semibold transition-colors ${isActive ? "text-ink" : "text-faint group-hover:text-ink"}`}>{label}</span>
              </>
            )}
          </NavLink>
        ); })}
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pb-[84px] md:pb-0">
        <Outlet />
      </main>

      {/* เมนูล่าง (มือถือ) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-white border-t border-line flex justify-around pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {NAV.map(({ to, label, icon, end }) => { const Icon = icon; return (
          <NavLink key={to} to={to} end={end} className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
            {({ isActive }) => (
              <>
                <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center transition-colors ${isActive ? "bg-ink text-white" : "text-faint"}`}>
                  <Icon size={21} key={isActive ? "on" : "off"} className={isActive ? "nav-bounce" : ""} />
                </span>
                <span className={isActive ? "text-ink" : "text-faint"}>{label}</span>
              </>
            )}
          </NavLink>
        ); })}
      </nav>
    </div>
  );
}
