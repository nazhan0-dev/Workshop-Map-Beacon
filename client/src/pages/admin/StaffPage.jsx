import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Search, X, Phone, ShieldCheck, UserSearch, UserRound, Check } from "lucide-react";
import Header from "../../components/layout/Header";
import { Button, Modal, Field, inputCls, Segmented } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";
import useAuthStore from "../../store/useAuthStore";
import { initials } from "../../lib/shifts";
import RankBadge, { RankDot } from "../../components/RankBadge";
import { RANKS, RANK_KEYS } from "../../lib/rank";

const EMPTY = { name: "", username: "", password: "", role: "USER", rank: "STAFF", position: "", phone: "" };

// สีพื้นหลังรูปโปรไฟล์ เลือกจากชื่อ (คนเดิมได้สีเดิมเสมอ)
const TONES = [
  "bg-[#e5f4ec] text-[#1f7a4f]", "bg-[#e8eefc] text-[#2f55b5]", "bg-[#fbf1e3] text-[#a0621a]",
  "bg-[#f4e9fb] text-[#7a3fa3]", "bg-[#fbeae8] text-[#b23b32]", "bg-[#e6f5f6] text-[#1f7680]",
];
const toneOf = (s) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

function StaffAvatar({ user }) {
  const cls = user.role === "ADMIN" ? "bg-ink text-white" : toneOf(user.name);
  return (
    <span className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${cls}`} aria-hidden>
      {initials(user.name)}
      {user.role !== "ADMIN" && <RankDot rank={user.rank} />}
      {user.role === "ADMIN" && (
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center ring-2 ring-white">
          <ShieldCheck size={11} />
        </span>
      )}
    </span>
  );
}

// ไฮไลต์คำที่ค้นหา
function Hl({ text, q }) {
  if (!q || !text) return text || null;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="bg-warn-soft text-ink rounded px-0.5">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3.5 border-b border-line last:border-0">
      <span className="w-11 h-11 rounded-full skeleton bg-paper" />
      <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded skeleton bg-paper" /><div className="h-3 w-56 rounded skeleton bg-paper" /></div>
    </div>
  );
}

export default function StaffPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // {..., id?}
  const [resetFor, setResetFor] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("ALL");
  const searchRef = useRef(null);

  const load = () => api.get("/users").then(setUsers).catch((e) => toast(errMsg(e), "error"));
  useEffect(() => { load(); }, []);

  // กด "/" เพื่อไปที่ช่องค้นหา
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); } };

  const save = (e) => { e.preventDefault(); run(async () => {
    if (form.id) await api.put(`/users/${form.id}`, form); else await api.post("/users", form);
    toast(form.id ? "บันทึกแล้ว" : `เพิ่ม ${form.name} แล้ว`); setForm(null); load();
  }); };

  const all = users || [];
  const admins = all.filter((u) => u.role === "ADMIN").length;
  const needle = q.trim().toLowerCase();
  const byRole = all.filter((u) => role === "ALL" || u.role === role);
  const list = byRole.filter((u) => !needle || `${u.name} ${u.username} ${u.position || ""} ${RANKS[u.rank]?.label || ""} ${u.phone || ""}`.toLowerCase().includes(needle));

  const roleOptions = [
    { value: "ALL", label: `ทั้งหมด ${all.length}` },
    { value: "ADMIN", label: `ผู้ดูแล ${admins}` },
    { value: "USER", label: `รปภ. ${all.length - admins}` },
  ];
  const iconBtn = "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95";

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title="พนักงาน" subtitle={users ? `${all.length} บัญชี · ผู้ดูแล ${admins} · รปภ. ${all.length - admins}` : "กำลังโหลด…"}>
        <Button variant="dark" className="group" onClick={() => setForm({ ...EMPTY })}>
          <Plus size={16} className="transition-transform duration-200 group-hover:rotate-90" />เพิ่มพนักงาน
        </Button>
      </Header>

      <div className="dash-rise surface mx-3 md:mx-0 p-3 md:p-4">
        {/* ค้นหา + กรองสิทธิ์ */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-2">
          <label className="group flex-1 flex items-center gap-2 bg-paper rounded-xl px-3.5 h-11 border border-transparent transition
            focus-within:bg-white focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgb(23_25_28/0.06)]">
            <Search size={16} className="text-faint transition-colors group-focus-within:text-ink" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ ชื่อผู้ใช้ ตำแหน่ง หรือเบอร์โทร"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
            {q ? (
              <button type="button" onClick={() => { setQ(""); searchRef.current?.focus(); }} aria-label="ล้างคำค้นหา"
                className="pop-in w-6 h-6 rounded-full bg-track text-mute hover:text-ink flex items-center justify-center"><X size={13} /></button>
            ) : <kbd className="hidden sm:block text-[11px] font-semibold text-faint border border-line rounded px-1.5 py-0.5">/</kbd>}
          </label>
          <Segmented options={roleOptions} value={role} onChange={setRole} className="sm:w-[300px] shrink-0" />
        </div>

        {q && users && (
          <p className="pop-in text-xs text-mute px-1 pb-1">พบ {list.length} จาก {byRole.length} คน</p>
        )}

        {!users ? (
          <div>{[0, 1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}</div>
        ) : list.length === 0 ? (
          <div className="pop-in flex flex-col items-center text-center py-12">
            <span className="w-14 h-14 rounded-2xl bg-paper text-mute flex items-center justify-center mb-3"><UserSearch size={24} /></span>
            <p className="font-semibold">ไม่พบพนักงาน</p>
            <p className="text-sm text-mute mt-1">{q ? `ไม่มีใครตรงกับ "${q}"` : "เพิ่มพนักงานคนแรกได้เลย"}</p>
            {q && <button onClick={() => setQ("")} className="mt-3 text-sm font-semibold text-brand hover:underline">ล้างคำค้นหา</button>}
          </div>
        ) : (
          <ul key={`${role}-${needle ? "q" : ""}`}>
            {list.map((u, i) => (
              <li key={u.id} style={{ animationDelay: `${Math.min(i, 12) * 0.035}s` }}
                className="row-in group flex items-center gap-3 px-3 py-3 border-b border-line last:border-0 hover:bg-paper/70 transition-colors">
                <StaffAvatar user={u} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold truncate"><Hl text={u.name} q={needle} /></span>
                    {u.id === me.id && <span className="text-[10px] font-bold text-brand bg-brand-soft rounded px-1.5 py-0.5 shrink-0">คุณ</span>}
                  </div>
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-0.5 text-xs text-mute">
                    <span>@<Hl text={u.username} q={needle} /></span>
                    {u.role === "ADMIN"
                      ? <span className="font-semibold rounded-md px-1.5 py-0.5 bg-ink text-white">ผู้ดูแลระบบ</span>
                      : <RankBadge rank={u.rank} />}
                    {u.position && <span className="text-ink"><Hl text={u.position} q={needle} /></span>}
                    {u.phone && (
                      <a href={`tel:${u.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-ink">
                        <Phone size={11} /><Hl text={u.phone} q={needle} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 sm:opacity-50 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button onClick={() => setForm({ ...EMPTY, ...u, position: u.position || "", phone: u.phone || "" })}
                    className={`${iconBtn} hover:bg-white hover:shadow-sm`} aria-label={`แก้ไข ${u.name}`} title="แก้ไข"><Pencil size={16} /></button>
                  <button onClick={() => { setPw(""); setResetFor(u); }}
                    className={`${iconBtn} hover:bg-white hover:shadow-sm`} aria-label={`รีเซ็ตรหัสผ่าน ${u.name}`} title="รีเซ็ตรหัสผ่าน"><KeyRound size={16} /></button>
                  {u.id !== me.id
                    ? <button onClick={() => setDelFor(u)} className={`${iconBtn} text-danger hover:bg-danger-soft`} aria-label={`ลบ ${u.name}`} title="ลบ"><Trash2 size={16} /></button>
                    : <span className="w-9" />}
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
            {form.role === "USER" && (
              <div>
                <span id="rank-label" className="block text-sm font-semibold mb-1.5">ตำแหน่ง</span>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-labelledby="rank-label">
                  {RANK_KEYS.map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={form.rank === k} onClick={() => setForm((f) => ({ ...f, rank: k }))}
                      className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${form.rank === k ? "border-ink bg-ink text-white" : "border-line hover:bg-paper"}`}>
                      {RANKS[k].label}
                    </button>
                  ))}
                </div>
                <span className="block text-xs text-mute mt-1">หัวหน้าและรองหัวหน้าจะขึ้นก่อนในรายชื่อ และเพื่อนร่วมกะจะเห็นตำแหน่งนี้</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="หน้าที่ (ไม่บังคับ)"><input className={inputCls} value={form.position} onChange={set("position")} placeholder="เช่น ประจำป้อมหน้า" /></Field>
              <Field label="เบอร์โทร"><input className={inputCls} value={form.phone} onChange={set("phone")} inputMode="tel" /></Field>
            </div>
            <div>
              <span id="role-label" className="block text-sm font-semibold mb-1.5">สิทธิ์การใช้งาน</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="role-label">
                {[
                  { v: "USER", icon: UserRound, title: "รปภ.", sub: "ดูเวรของตัวเอง" },
                  { v: "ADMIN", icon: ShieldCheck, title: "ผู้ดูแล", sub: "จัดเวรและจัดการระบบ" },
                ].map((o) => {
                  const on = form.role === o.v;
                  const locked = form.id === me.id;
                  return (
                    <button key={o.v} type="button" role="radio" aria-checked={on} disabled={locked && !on}
                      onClick={() => !locked && setForm((f) => ({ ...f, role: o.v }))}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border-[1.5px] text-left transition-all duration-200
                        ${on ? "border-ink bg-white shadow-[0_4px_14px_-6px_rgb(23_25_28/0.25)]" : "border-line hover:border-ink/30 hover:bg-paper"}
                        disabled:opacity-40 disabled:cursor-not-allowed`}>
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on ? "bg-ink text-white" : "bg-paper text-mute"}`}>
                        <o.icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{o.title}</span>
                        <span className="block text-xs text-mute">{o.sub}</span>
                      </span>
                      {on && (
                        <span className="pop-in absolute top-2 right-2 w-4 h-4 rounded-full bg-brand text-white flex items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {form.id === me.id && <span className="block text-xs text-mute mt-1">เปลี่ยนสิทธิ์ของตัวเองไม่ได้ เพื่อไม่ให้ระบบไม่มีผู้ดูแล</span>}
            </div>
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
