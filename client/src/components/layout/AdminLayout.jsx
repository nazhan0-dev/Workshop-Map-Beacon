import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Map, LayoutGrid, Users, MapPin, LogOut, Shield } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { initials } from "../../lib/shifts";

const NAV = [
  { to: "/admin/assign", label: "จัดเวร", icon: Map },
  { to: "/admin/dashboard", label: "ภาพรวม", icon: LayoutGrid },
  { to: "/admin/staff", label: "พนักงาน", icon: Users },
  { to: "/admin/locations", label: "จุดเวร", icon: MapPin },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="h-dvh flex md:p-4 md:gap-3">
      {/* แถบเมนูซ้าย (จอใหญ่) */}
      <aside className="hidden md:flex surface w-[72px] shrink-0 flex-col items-center py-4 gap-2.5">
        <div className="w-11 h-11 rounded-[14px] bg-brand text-white flex items-center justify-center"><Shield size={22} /></div>
        <div className="w-9 h-px bg-line my-1.5" />
        {NAV.map(({ to, label, icon }) => { const Icon = icon; return (
          <NavLink key={to} to={to} title={label} aria-label={label}
            className={({ isActive }) =>
              `relative w-11 h-11 rounded-[13px] border flex items-center justify-center transition ${
                isActive
                  ? "bg-ink border-ink text-white before:content-[''] before:absolute before:-left-3.5 before:top-3 before:w-[3px] before:h-5 before:rounded-r before:bg-brand"
                  : "bg-white border-line text-ink hover:bg-paper"}`}>
            <Icon size={19} />
          </NavLink>
        ); })}
        <div className="flex-1" />
        <button onClick={onLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ"
          className="w-11 h-11 rounded-[13px] border border-line flex items-center justify-center hover:bg-paper"><LogOut size={18} /></button>
        <div title={user?.name} className="w-11 h-11 rounded-full bg-brand-soft text-brand font-semibold text-sm flex items-center justify-center">
          {initials(user?.name)}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pb-[76px] md:pb-0">
        <Outlet />
      </main>

      {/* เมนูล่าง (มือถือ) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-white border-t border-line flex justify-around pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {NAV.map(({ to, label, icon }) => { const Icon = icon; return (
          <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
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
  );
}
