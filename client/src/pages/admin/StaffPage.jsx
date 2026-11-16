import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Search } from "lucide-react";
import Header from "../../components/layout/Header";
import { Avatar, Button, Modal, Field, inputCls, Spinner, Empty } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import useAuthStore from "../../store/useAuthStore";

const EMPTY = { name: "", username: "", password: "", role: "USER", position: "", phone: "" };

export default function StaffPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // {..., id?}
  const [resetFor, setResetFor] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/users").then(setUsers).catch((e) => toast(errMsg(e), "error"));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); } };

  const save = (e) => { e.preventDefault(); run(async () => {
    if (form.id) await api.put(`/users/${form.id}`, form); else await api.post("/users", form);
    toast(form.id ? "บันทึกแล้ว" : `เพิ่ม ${form.name} แล้ว`); setForm(null); load();
  }); };

  const list = (users || []).filter((u) => !q || `${u.name} ${u.username} ${u.position || ""}`.includes(q));

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title="พนักงาน" subtitle={users ? `${users.length} บัญชี` : ""}>
        <Button variant="dark" onClick={() => setForm({ ...EMPTY })}><Plus size={16} />เพิ่มพนักงาน</Button>
      </Header>

      <div className="surface mx-3 md:mx-0 p-3 md:p-4">
        <label className="flex items-center gap-2 bg-paper rounded-xl px-3.5 h-11 mb-2">
          <Search size={16} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรือตำแหน่ง" className="flex-1 bg-transparent outline-none text-[15px]" />
        </label>
        {!users ? <div className="py-10 flex justify-center"><Spinner /></div> : list.length === 0 ? (
          <Empty title="ไม่พบพนักงาน" text={q ? "ลองค้นหาด้วยคำอื่น" : "เพิ่มพนักงานคนแรกได้เลย"} />
        ) : (
          <ul>
            {list.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-2 py-3 border-b border-line last:border-0">
                <Avatar name={u.name} size={40} dark={u.role === "ADMIN"} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{u.name} {u.role === "ADMIN" && <span className="text-[11px] font-semibold bg-ink text-white rounded px-1.5 py-0.5 ml-1 align-middle">ผู้ดูแล</span>}</div>
                  <div className="text-xs text-mute truncate">@{u.username}{u.position ? ` · ${u.position}` : ""}{u.phone ? ` · ${u.phone}` : ""}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setForm({ ...EMPTY, ...u, position: u.position || "", phone: u.phone || "" })} className="p-2 rounded-lg hover:bg-paper" aria-label={`แก้ไข ${u.name}`} title="แก้ไข"><Pencil size={17} /></button>
                  <button onClick={() => { setPw(""); setResetFor(u); }} className="p-2 rounded-lg hover:bg-paper" aria-label={`รีเซ็ตรหัสผ่าน ${u.name}`} title="รีเซ็ตรหัสผ่าน"><KeyRound size={17} /></button>
                  {u.id !== me.id && <button onClick={() => setDelFor(u)} className="p-2 rounded-lg hover:bg-danger-soft text-danger" aria-label={`ลบ ${u.name}`} title="ลบ"><Trash2 size={17} /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}
        footer={<><Button onClick={() => setForm(null)}>ยกเลิก</Button><Button variant="dark" type="submit" form="staff-form" loading={busy}>{form?.id ? "บันทึก" : "เพิ่มพนักงาน"}</Button></>}>
        {form && (
          <form id="staff-form" onSubmit={save} className="flex flex-col gap-4">
            <Field label="ชื่อ-นามสกุล"><input className={inputCls} value={form.name} onChange={set("name")} required autoFocus /></Field>
            <Field label="ชื่อผู้ใช้" hint="ใช้เข้าสู่ระบบ ภาษาอังกฤษหรือตัวเลข"><input className={inputCls} value={form.username} onChange={set("username")} required autoCapitalize="none" /></Field>
            {!form.id && <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 6 ตัว แจ้งพนักงานให้เปลี่ยนเองภายหลัง"><input className={inputCls} type="text" value={form.password} onChange={set("password")} required minLength={6} /></Field>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="ตำแหน่ง"><input className={inputCls} value={form.position} onChange={set("position")} placeholder="เจ้าหน้าที่" /></Field>
              <Field label="เบอร์โทร"><input className={inputCls} value={form.phone} onChange={set("phone")} inputMode="tel" /></Field>
            </div>
            <Field label="สิทธิ์">
              <select className={inputCls} value={form.role} onChange={set("role")} disabled={form.id === me.id}>
                <option value="USER">รปภ. (ดูเวรของตัวเอง)</option>
                <option value="ADMIN">ผู้ดูแล (จัดเวรได้)</option>
              </select>
            </Field>
          </form>
        )}
      </Modal>

      <Modal open={!!resetFor} onClose={() => setResetFor(null)} title="รีเซ็ตรหัสผ่าน"
        footer={<><Button onClick={() => setResetFor(null)}>ยกเลิก</Button><Button variant="dark" loading={busy} disabled={pw.length < 6}
          onClick={() => run(async () => { await api.post(`/users/${resetFor.id}/reset-password`, { password: pw }); toast(`รีเซ็ตรหัสผ่านของ ${resetFor.name} แล้ว`); setResetFor(null); })}>รีเซ็ตรหัสผ่าน</Button></>}>
        <p className="text-sm mb-3">ตั้งรหัสผ่านใหม่ให้ <b>{resetFor?.name}</b> แล้วแจ้งให้เขาเปลี่ยนเองที่หน้าโปรไฟล์</p>
        <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัว"><input className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
      </Modal>

      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="ลบพนักงาน"
        footer={<><Button onClick={() => setDelFor(null)}>ยกเลิก</Button><Button variant="danger" loading={busy}
          onClick={() => run(async () => { await api.del(`/users/${delFor.id}`); toast(`ลบ ${delFor.name} แล้ว`); setDelFor(null); load(); })}>ลบพนักงาน</Button></>}>
        <p className="text-sm">ลบ <b>{delFor?.name}</b> ออกจากระบบ เวรทั้งหมดของคนนี้จะถูกลบด้วย และกู้คืนไม่ได้</p>
      </Modal>
    </div>
  );
}
