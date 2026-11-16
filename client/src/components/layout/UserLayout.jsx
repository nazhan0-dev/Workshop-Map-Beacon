import { NavLink, Outlet } from "react-router-dom";
import { Home, Map, User } from "lucide-react";

const NAV = [
  { to: "/me", label: "เวรของฉัน", icon: Home, end: true },
  { to: "/me/map", label: "แผนที่", icon: Map },
  { to: "/me/profile", label: "โปรไฟล์", icon: User },
];

// ฝั่ง รปภ. ออกแบบสำหรับมือถือเป็นหลัก จอใหญ่จะแสดงเป็นคอลัมน์กลางจอ
export default function UserLayout() {
  return (
    <div className="min-h-dvh bg-[#dfe1dd] md:py-6">
      <div className="relative mx-auto max-w-[440px] min-h-dvh md:min-h-[calc(100dvh-48px)] bg-paper md:rounded-[28px] md:overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col pb-[84px]">
          <Outlet />
        </div>
        <nav className="fixed md:absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-[1000] bg-white border-t border-line flex justify-around pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          {NAV.map(({ to, label, icon, end }) => { const Icon = icon; return (
            <NavLink key={to} to={to} end={end} className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
              {({ isActive }) => (
                <>
                  <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center ${isActive ? "bg-ink text-white" : "text-faint"}`}><Icon size={21} /></span>
                  <span className={isActive ? "text-ink" : "text-faint"}>{label}</span>
                </>
              )}
            </NavLink>
          ); })}
        </nav>
      </div>
    </div>
  );
}
