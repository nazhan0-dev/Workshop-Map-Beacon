import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Phone } from "lucide-react";
import Header from "../../components/layout/Header";
import { Button, Modal, Spinner, Empty } from "../../components/ui";
import AddLocationModal from "../../components/locations/AddLocationModal";
import { api, errMsg } from "../../lib/api";
import { toast } from "../../store/useToast";

export default function LocationsPage() {
  const [locs, setLocs] = useState(null);
  const [edit, setEdit] = useState(null); // {} = เพิ่มใหม่
  const [delFor, setDelFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/locations").then(setLocs).catch((e) => toast(errMsg(e), "error"));
  useEffect(() => { load(); }, []);

  const remove = async () => {
    setBusy(true);
    try { await api.del(`/locations/${delFor.id}`); toast(`ลบ ${delFor.name} แล้ว`); setDelFor(null); load(); }
    catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title="จุดเวร" subtitle={locs ? `${locs.length} จุด` : ""}>
        <Button variant="dark" onClick={() => setEdit({})}><Plus size={16} />เพิ่มจุด</Button>
      </Header>

      <div className="surface mx-3 md:mx-0 p-3 md:p-4">
        {!locs ? <div className="py-10 flex justify-center"><Spinner /></div> : locs.length === 0 ? (
          <Empty title="ยังไม่มีจุดเวร" text="เพิ่มจุดแรก แล้วไปจัดคนที่หน้าจัดเวร" action={<Button variant="dark" onClick={() => setEdit({})}><Plus size={16} />เพิ่มจุด</Button>} />
        ) : (
          <ul>
            {locs.map((l) => (
              <li key={l.id} className="flex items-start gap-4 px-2 py-4 border-b border-line last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{l.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[["เช้า", l.need_morning], ["บ่าย", l.need_afternoon], ["ดึก", l.need_night]].map(([s, n]) => (
                      <span key={s} className="text-xs bg-paper rounded-md px-2 py-1">กะ{s} <b>{n}</b> คน</span>
                    ))}
                  </div>
                  {l.duties && <p className="text-sm text-mute mt-2">{l.duties}</p>}
                  {l.contact_phone && <p className="text-xs text-mute mt-1 flex items-center gap-1"><Phone size={12} />หัวหน้าจุด {l.contact_phone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEdit(l)} className="p-2 rounded-lg hover:bg-paper" aria-label={`แก้ไข ${l.name}`} title="แก้ไข"><Pencil size={17} /></button>
                  <button onClick={() => setDelFor(l)} className="p-2 rounded-lg hover:bg-danger-soft text-danger" aria-label={`ลบ ${l.name}`} title="ลบ"><Trash2 size={17} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {edit && <AddLocationModal initial={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}

      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="ลบจุดเวร"
        footer={<><Button onClick={() => setDelFor(null)}>ยกเลิก</Button><Button variant="danger" loading={busy} onClick={remove}>ลบจุดเวร</Button></>}>
        <p className="text-sm">ลบ <b>{delFor?.name}</b> เวรทั้งหมดที่จุดนี้จะถูกลบด้วย และกู้คืนไม่ได้</p>
      </Modal>
    </div>
  );
}
