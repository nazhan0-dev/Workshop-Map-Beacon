import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Phone, Search, X, Sun, Sunset, Moon, AlertTriangle, MapPinned, ArrowRight, Users } from "lucide-react";
import Header from "../../components/layout/Header";
import { Button, Modal } from "../../components/ui";
import AddLocationModal from "../../components/locations/AddLocationModal";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";

const SHIFTS = [
  { key: "need_morning", label: "เช้า", icon: Sun },
  { key: "need_afternoon", label: "บ่าย", icon: Sunset },
  { key: "need_night", label: "ดึก", icon: Moon },
];

// แผนที่ย่อจากภาพ tile ของ OpenStreetMap (3x3 แผ่น วางให้จุดอยู่กลางกรอบ)
const TILE = 256;
function MiniMap({ lat, lng, zoom = 16 }) {
  const n = 2 ** zoom;
  const x = ((Number(lng) + 180) / 360) * n;
  const r = (Number(lat) * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(x), ty = Math.floor(y);
  const px = (x - tx) * TILE, py = (y - ty) * TILE;
  const tiles = [];
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tiles.push([i, j]);

  return (
    <div className="relative h-[120px] overflow-hidden bg-[#edefeb]" aria-hidden="true">
      <div className="mini-map absolute" style={{ left: `calc(50% - ${px + TILE}px)`, top: `calc(50% - ${py + TILE}px)`, width: TILE * 3, height: TILE * 3, transformOrigin: `${px + TILE}px ${py + TILE}px` }}>
        {tiles.map(([i, j]) => (
          <img key={`${i},${j}`} src={`https://tile.openstreetmap.org/${zoom}/${tx + i}/${ty + j}.png`} alt="" loading="lazy" draggable={false}
            className="absolute w-64 h-64 max-w-none select-none" style={{ left: (i + 1) * TILE, top: (j + 1) * TILE }} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
      <span className="mini-pin absolute left-1/2 top-1/2 w-9 h-9 -ml-[18px] -mt-[18px] rounded-full bg-ink text-white flex items-center justify-center shadow-[0_6px_16px_rgb(23_25_28/0.35)] ring-[3px] ring-white">
        <MapPinned size={16} />
      </span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="surface overflow-hidden">
      <div className="h-[120px] skeleton bg-paper" />
      <div className="p-4 space-y-3"><div className="h-4 w-1/2 rounded skeleton bg-paper" /><div className="h-7 w-3/4 rounded skeleton bg-paper" /><div className="h-3 w-full rounded skeleton bg-paper" /></div>
    </div>
  );
}

export default function LocationsPage() {
  const [locs, setLocs] = useState(null);
  const [edit, setEdit] = useState(null); // {} = เพิ่มใหม่
  const [delFor, setDelFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const load = () => api.get("/locations").then(setLocs).catch((e) => toast(errMsg(e), "error"));
  useEffect(() => { load(); }, []);

  const remove = async () => {
    setBusy(true);
    try { await api.del(`/locations/${delFor.id}`); toast(`ลบ ${delFor.name} แล้ว`); setDelFor(null); load(); }
    catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  const all = locs || [];
  const perDay = all.reduce((s, l) => s + l.need_morning + l.need_afternoon + l.need_night, 0);
  const needle = q.trim().toLowerCase();
  const list = all.filter((l) => !needle || `${l.name} ${l.duties || ""} ${l.cautions || ""}`.toLowerCase().includes(needle));
  const iconBtn = "w-8 h-8 rounded-lg bg-white/95 backdrop-blur flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-110 active:scale-95";

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title="จุดเวร" subtitle={locs ? `${all.length} จุด · ต้องการรวม ${perDay} คนต่อวัน` : "กำลังโหลด…"}>
        <Button variant="dark" className="group" onClick={() => setEdit({})}>
          <Plus size={16} className="transition-transform duration-200 group-hover:rotate-90" />เพิ่มจุด
        </Button>
      </Header>

      <div className="px-3 md:px-0">
        {all.length > 0 && (
          <label className="dash-rise group flex items-center gap-2 bg-white rounded-xl px-3.5 h-11 mb-3 border border-line transition
            focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgb(23_25_28/0.06)] max-w-md">
            <Search size={16} className="text-faint transition-colors group-focus-within:text-ink" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อจุด หน้าที่ หรือข้อควรระวัง"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
            {q && (
              <button type="button" onClick={() => { setQ(""); searchRef.current?.focus(); }} aria-label="ล้างคำค้นหา"
                className="pop-in w-6 h-6 rounded-full bg-track text-mute hover:text-ink flex items-center justify-center"><X size={13} /></button>
            )}
          </label>
        )}

        {!locs ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
        ) : all.length === 0 ? (
          <div className="dash-rise surface flex flex-col items-center text-center py-14 px-6">
            <span className="w-14 h-14 rounded-2xl bg-paper flex items-center justify-center mb-3"><MapPinned size={24} /></span>
            <p className="font-semibold">ยังไม่มีจุดเวร</p>
            <p className="text-sm text-mute mt-1">เพิ่มจุดแรก แล้วไปจัดคนที่หน้าจัดเวร</p>
            <Button variant="dark" className="mt-4" onClick={() => setEdit({})}><Plus size={16} />เพิ่มจุด</Button>
          </div>
        ) : list.length === 0 ? (
          <div className="pop-in surface text-center py-12 text-sm text-mute">
            ไม่มีจุดที่ตรงกับ "{q}" <button onClick={() => setQ("")} className="ml-1 font-semibold text-brand hover:underline">ล้างคำค้นหา</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((l, i) => {
              const total = l.need_morning + l.need_afternoon + l.need_night;
              return (
                <article key={l.id} style={{ animationDelay: `${Math.min(i, 9) * 0.05}s` }}
                  className="loc-card dash-rise group surface overflow-hidden flex flex-col">
                  <div className="relative">
                    <MiniMap lat={l.lat} lng={l.lng} />
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5 sm:opacity-0 sm:-translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:focus-within:opacity-100 sm:focus-within:translate-y-0 transition-all duration-200">
                      <button onClick={() => setEdit(l)} className={iconBtn} aria-label={`แก้ไข ${l.name}`} title="แก้ไข"><Pencil size={15} /></button>
                      <button onClick={() => setDelFor(l)} className={`${iconBtn} text-danger hover:bg-danger-soft`} aria-label={`ลบ ${l.name}`} title="ลบ"><Trash2 size={15} /></button>
                    </div>
                    <span className="absolute left-2.5 bottom-2.5 flex items-center gap-1 text-[11px] font-semibold bg-white/95 backdrop-blur rounded-md px-2 py-1 shadow-sm">
                      <Users size={12} />{total} คน/วัน
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-[15px] leading-snug">{l.name}</h3>
                    <div className="flex gap-1.5 mt-2.5">
                      {SHIFTS.map((s) => (
                        <span key={s.key} className={`flex-1 flex items-center justify-center gap-1.5 text-xs rounded-lg py-1.5
                          ${l[s.key] ? "bg-paper text-ink" : "bg-paper/50 text-faint"}`} title={`กะ${s.label} ต้องการ ${l[s.key]} คน`}>
                          <s.icon size={13} />{s.label} <b>{l[s.key]}</b>
                        </span>
                      ))}
                    </div>
                    {l.duties && <p className="text-sm text-mute mt-3 line-clamp-2">{l.duties}</p>}
                    {l.cautions && (
                      <div className="mt-2.5 border-l-2 border-warn pl-2.5">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-warn"><AlertTriangle size={11} />ข้อควรระวัง</span>
                        <p className="text-xs text-mute line-clamp-2 mt-0.5">{l.cautions}</p>
                      </div>
                    )}

                    <div className="mt-auto pt-3 flex items-center gap-2">
                      {l.contact_phone
                        ? <a href={`tel:${l.contact_phone}`} className="flex items-center gap-1.5 text-xs text-mute hover:text-ink"><Phone size={12} />{l.contact_phone}</a>
                        : <span className="text-xs text-faint">ไม่มีเบอร์หัวหน้าจุด</span>}
                      <button onClick={() => navigate(`/admin/assign?loc=${l.id}`)}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold text-ink rounded-lg px-2.5 py-1.5 hover:bg-paper transition-colors group/btn">
                        ดูบนแผนที่จัดเวร<ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {edit && <AddLocationModal initial={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }}
        near={all.length ? [all.reduce((s, l) => s + Number(l.lat), 0) / all.length, all.reduce((s, l) => s + Number(l.lng), 0) / all.length] : null} />}

      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="ลบจุดเวร"
        footer={<><Button onClick={() => setDelFor(null)}>ยกเลิก</Button><Button variant="danger" loading={busy} onClick={remove}>ลบจุดเวร</Button></>}>
        <p className="text-sm">ลบ <b>{delFor?.name}</b> เวรทั้งหมดที่จุดนี้จะถูกลบด้วย และกู้คืนไม่ได้</p>
      </Modal>
    </div>
  );
}
