import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, User, Lock, Eye, EyeOff } from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import { Button } from "../components/ui";
import { errMsg } from "../lib/api";

export default function LoginPage() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "ADMIN" ? "/admin/assign" : "/me"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(username.trim(), password);
      navigate(u.role === "ADMIN" ? "/admin/assign" : "/me", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const box = "flex items-center gap-2.5 h-[52px] rounded-2xl bg-paper px-4 border border-transparent focus-within:border-ink focus-within:bg-white";

  return (
    <div className="min-h-dvh bg-white md:bg-paper flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-[400px] md:surface px-6 py-10 md:p-10 flex flex-col">
        <div className="w-14 h-14 rounded-[18px] bg-brand text-white flex items-center justify-center"><Shield size={28} /></div>
        <h1 className="text-[28px] font-bold mt-7">เข้าสู่ระบบ</h1>
        <p className="text-mute mt-1">ระบบจัดเวรเจ้าหน้าที่รักษาความปลอดภัย</p>

        <label className="mt-9 text-sm font-semibold mb-2" htmlFor="u">ชื่อผู้ใช้</label>
        <div className={box}>
          <User size={18} className="text-faint" />
          <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="กรอกชื่อผู้ใช้"
            autoComplete="username" autoCapitalize="none" className="flex-1 bg-transparent outline-none text-[15px]" required />
        </div>

        <label className="mt-5 text-sm font-semibold mb-2" htmlFor="p">รหัสผ่าน</label>
        <div className={box}>
          <Lock size={18} className="text-faint" />
          <input id="p" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" className="flex-1 bg-transparent outline-none text-[15px]" required />
          <button type="button" onClick={() => setShow((v) => !v)} className="text-faint hover:text-ink" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="text-sm text-danger mt-4" role="alert">{error}</p>}

        <Button variant="dark" type="submit" loading={busy} className="h-[54px] rounded-2xl text-base mt-7">เข้าสู่ระบบ</Button>
        <p className="text-xs text-mute text-center mt-8">ลืมรหัสผ่าน ติดต่อหัวหน้าเวรหรือผู้ดูแลระบบ</p>
      </form>
    </div>
  );
}
