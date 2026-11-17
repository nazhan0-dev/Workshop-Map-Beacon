import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import { Spinner, Toaster } from "./components/ui";
import AdminLayout from "./components/layout/AdminLayout";
import UserLayout from "./components/layout/UserLayout";
import LoginPage from "./pages/LoginPage";
import AssignPage from "./pages/admin/AssignPage";
import DashboardPage from "./pages/admin/DashboardPage";
import StaffPage from "./pages/admin/StaffPage";
import LocationsPage from "./pages/admin/LocationsPage";
import MyShiftsPage from "./pages/user/MyShiftsPage";
import MyMapPage from "./pages/user/MyMapPage";
import ProfilePage from "./pages/user/ProfilePage";
import ReportsPage from "./pages/user/ReportsPage";
import IncidentsPage from "./pages/admin/IncidentsPage";
import LeavesAdminPage from "./pages/admin/LeavesPage";
import LeavesPage from "./pages/user/LeavesPage";

// กันหน้าตาม role: ADMIN ไป /admin, USER ไป /me
function RequireRole({ role, children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "ADMIN" ? "/admin/assign" : "/me"} replace />;
  return children;
}

function Home() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin/assign" : "/me"} replace />;
}

export default function App() {
  const { ready, init } = useAuthStore();
  useEffect(() => { init(); }, [init]);

  if (!ready) return <div className="h-dvh flex items-center justify-center"><Spinner /></div>;

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<RequireRole role="ADMIN"><AdminLayout /></RequireRole>}>
          <Route index element={<Navigate to="assign" replace />} />
          <Route path="assign" element={<AssignPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="leaves" element={<LeavesAdminPage />} />
        </Route>
        <Route path="/me" element={<RequireRole role="USER"><UserLayout /></RequireRole>}>
          <Route index element={<MyShiftsPage />} />
          <Route path="map" element={<MyMapPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster />
    </>
  );
}
