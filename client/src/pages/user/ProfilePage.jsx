import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { Avatar, Button, Field, inputCls } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import useMyShifts from "../../store/useMyShifts";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (f.newPassword !== f.confirm) return setError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
    setBusy(true);
    try {
      await api.put("/auth/password", { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast("เปลี่ยนรหัสผ่านแล้ว");
      setF({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-3">
      <section className="bg-white rounded-3xl p-5 flex items-center gap-4">
        <Avatar name={user.name} size={56} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold">{user.name}</div>
          <div className="text-sm text-mute">@{user.username}{user.position ? ` · ${user.position}` : ""}</div>
        </div>
      </section>

      <form onSubmit={submit} className="bg-white rounded-3xl p-5 flex flex-col gap-4">
        <h2 className="font-semibold">เปลี่ยนรหัสผ่าน</h2>
        <Field label="รหัสผ่านปัจจุบัน"><input type="password" className={inputCls} value={f.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" required /></Field>
        <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัว"><input type="password" className={inputCls} value={f.newPassword} onChange={set("newPassword")} autoComplete="new-password" minLength={6} required /></Field>
        <Field label="ยืนยันรหัสผ่านใหม่"><input type="password" className={inputCls} value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required /></Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <Button variant="dark" type="submit" loading={busy} className="h-12 rounded-2xl">เปลี่ยนรหัสผ่าน</Button>
      </form>

      <Button className="h-12 rounded-2xl" onClick={() => { logout(); useMyShifts.setState({ items: null }); navigate("/login"); }}><LogOut size={17} />ออกจากระบบ</Button>
    </div>
  );
}
