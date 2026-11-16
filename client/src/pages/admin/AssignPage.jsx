import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Plus, X, AlertTriangle } from "lucide-react";
import useDutyStore from "../../store/useDutyStore";
import { toast } from "../../store/useToast";
import { errMsg } from "../../lib/api";
import { SHIFTS, SHIFT_INFO, needOf, statusOf, addDays, weekStart, fmtShort, fmtLong } from "../../lib/shifts";
import { Button, Segmented, Modal, Avatar, StatusDot, Spinner } from "../../components/ui";
import MapView, { ZoomControls, MapOverlay } from "../../components/map/MapView";
import LocationsList from "../../components/locations/LocationsList";
import PersonnelList, { FreeTray } from "../../components/people/PersonnelList";
import AddLocationModal from "../../components/locations/AddLocationModal";

export default function AssignPage() {
  const s = useDutyStore();
  const { date, shift, locations, staff, assignments, selectedId } = s;
  const [params] = useSearchParams();
  const [tab, setTab] = useState("locations");
  const [picking, setPicking] = useState(false); // กำลังเลือกตำแหน่งจุดใหม่
  const [newLoc, setNewLoc] = useState(null);
  const [addFor, setAddFor] = useState(null); // จุดที่กำลังเลือกคนเพิ่ม
  const [b2b, setB2b] = useState(null); // ยืนยันเวรต่อกัน
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyMode, setCopyMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const dateInput = useRef(null);

  // โหลดครั้งแรก (รับค่าจาก Dashboard ผ่าน ?date=&shift=&loc=)
  useEffect(() => {
    const d = params.get("date"), sh = params.get("shift"), loc = params.get("loc");
    useDutyStore.setState({
      ...(d ? { date: d } : {}), ...(SHIFTS.includes(sh) ? { shift: sh } : {}), ...(loc ? { selectedId: Number(loc) } : {}),
    });
    useDutyStore.getState().fetchBase().catch((e) => toast(errMsg(e), "error"));
    useDutyStore.getState().fetchAssignments().catch((e) => toast(errMsg(e), "error"));
  }, [params]);

  const byUser = useMemo(() => Object.fromEntries(assignments.map((a) => [a.user_id, a])), [assignments]);
  const free = staff.filter((u) => !byUser[u.id]);

  const counts = useMemo(() => {
    const c = {};
    assignments.forEach((a) => { c[a.location_id] = (c[a.location_id] || 0) + 1; });
    return c;
  }, [assignments]);

  const summary = { ok: 0, low: 0, empty: 0 };
  locations.forEach((l) => { const st = statusOf(counts[l.id] || 0, needOf(l, shift)); if (st in summary) summary[st]++; });

  const markers = locations.map((l) => ({
    id: l.id, lat: l.lat, lng: l.lng, name: l.name,
    status: statusOf(counts[l.id] || 0, needOf(l, shift)),
    label: `${counts[l.id] || 0}/${needOf(l, shift)}`,
  }));

  // จัดคน/ย้ายคน จากการลากหรือเลือกในรายการ
  async function handleDrop(item, loc, force = false) {
    try {
      if (item.kind === "asg") {
        if (item.locationId === loc.id) return;
        await s.move(item.id, loc.id);
        toast(`ย้าย ${item.name} ไป ${loc.name} แล้ว`);
      } else {
        await s.assign(item.userId, loc.id, force);
        toast(`เพิ่ม ${item.name} เข้า ${loc.name} แล้ว`);
      }
      s.select(loc.id);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === "BACK_TO_BACK") setB2b({ item, loc, conflicts: data.conflicts, message: data.message });
      else toast(errMsg(err), "error");
    }
  }

  async function removeAsg(a) {
    try { await s.remove(a.id); toast(`ถอน ${a.user_name} ออกแล้ว`); }
    catch (err) { toast(errMsg(err), "error"); }
  }

  async function doCopy() {
    setBusy(true);
    try {
      const r = copyMode === "day"
        ? await s.copy("day", addDays(date, -1), date)
        : await s.copy("week", addDays(weekStart(date), -7), weekStart(date));
      toast(r.message);
      setCopyMode(null);
    } catch (err) { toast(errMsg(err), "error"); }
    finally { setBusy(false); }
  }

  const shiftOptions = SHIFTS.map((k) => ({ value: k, label: SHIFT_INFO[k].label, sub: SHIFT_INFO[k].time }));
  const ws = weekStart(date);

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_290px_1fr] md:grid-rows-[auto_1fr] md:grid-cols-[380px_1fr] md:gap-x-3">
      {/* หัว: วันที่ + กะ */}
      <section className="bg-paper md:bg-white md:rounded-t-3xl px-4 pt-5 pb-3 md:px-5 md:pt-6 flex flex-col gap-4 md:col-start-1 md:row-start-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold flex-1">จัดเวร</h1>
          <button onClick={() => s.setDate(addDays(date, -1))} aria-label="วันก่อนหน้า" className="w-9 h-9 rounded-xl hover:bg-paper flex items-center justify-center"><ChevronLeft size={18} /></button>
          <button onClick={() => dateInput.current?.showPicker?.()}
            className="relative h-9 px-3 rounded-xl border border-line bg-white text-sm font-semibold flex items-center gap-2">
            <CalendarDays size={16} />{fmtShort(date)}
            <input ref={dateInput} type="date" value={date} onChange={(e) => e.target.value && s.setDate(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-none" tabIndex={-1} aria-label="เลือกวันที่" />
          </button>
          <button onClick={() => s.setDate(addDays(date, 1))} aria-label="วันถัดไป" className="w-9 h-9 rounded-xl hover:bg-paper flex items-center justify-center"><ChevronRight size={18} /></button>
        </div>
        <Segmented options={shiftOptions} value={shift} onChange={s.setShift} />
        <div className="flex gap-6 border-b border-line">
          {[["locations", "จุดเวร", locations.length], ["people", "พนักงาน", staff.length]].map(([k, l, n]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`pb-2.5 text-sm font-semibold ${tab === k ? "text-ink shadow-[inset_0_-2px_0_var(--color-ink)]" : "text-faint hover:text-mute"}`}>
              {l}<span className="text-faint font-medium ml-1">{n}</span>
            </button>
          ))}
        </div>
      </section>

      {/* แผนที่ */}
      <section className="relative overflow-hidden md:rounded-3xl md:surface md:col-start-2 md:row-start-1 md:row-span-2">
        <MapView markers={markers} selectedId={selectedId} onSelect={(id) => { s.select(id); setTab("locations"); }}
          picking={picking} onPick={(lat, lng) => { setPicking(false); setNewLoc({ lat: lat.toFixed(6), lng: lng.toFixed(6) }); }}
          fitKey={locations.length ? "loaded" : "init"}>
          <ZoomControls />
          <MapOverlay className="absolute right-3 top-3 md:right-4 md:top-4 z-[500] flex gap-2">
            <div className="relative">
              <Button className="shadow-sm" onClick={() => setCopyOpen((v) => !v)}><Copy size={16} /><span className="hidden sm:inline">คัดลอกเวร</span></Button>
              {copyOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-line p-1.5">
                  <button onClick={() => { setCopyOpen(false); setCopyMode("day"); }} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-paper">
                    <div className="text-sm font-semibold">จากเมื่อวาน</div><div className="text-xs text-mute">ทุกกะของ {fmtShort(addDays(date, -1))}</div>
                  </button>
                  <button onClick={() => { setCopyOpen(false); setCopyMode("week"); }} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-paper">
                    <div className="text-sm font-semibold">ทั้งสัปดาห์จากสัปดาห์ก่อน</div><div className="text-xs text-mute">7 วัน เริ่ม {fmtShort(ws)}</div>
                  </button>
                </div>
              )}
            </div>
            <Button variant="dark" onClick={() => setPicking((v) => !v)}>
              {picking ? <><X size={16} />ยกเลิก</> : <><Plus size={16} /><span className="hidden sm:inline">เพิ่มจุด</span></>}
            </Button>
          </MapOverlay>
          {picking && (
            <MapOverlay className="absolute left-1/2 -translate-x-1/2 top-16 md:top-4 z-[500] bg-ink text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg">
              คลิกบนแผนที่เพื่อวางจุดเวรใหม่
            </MapOverlay>
          )}
          <MapOverlay className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-4 z-[500] bg-white rounded-2xl shadow-xl py-2.5 pl-4 pr-3 max-w-[80%]">
            <FreeTray free={free} />
          </MapOverlay>
        </MapView>
      </section>

      {/* รายการ */}
      <section className="bg-white rounded-t-3xl -mt-5 md:mt-0 relative z-[600] md:z-auto md:rounded-t-none md:rounded-b-3xl md:col-start-1 md:row-start-2 min-h-0 overflow-y-auto px-3 md:px-3 pb-4 shadow-[0_-6px_24px_rgb(23_25_28/0.08)] md:shadow-none">
        <div className="md:hidden w-9 h-1 rounded bg-line mx-auto my-2.5" />
        <div className="flex items-center gap-4 px-2 py-3 text-[13px] text-mute">
          {[["ok", "ครบ"], ["low", "ขาด"], ["empty", "ว่าง"]].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5"><StatusDot status={k} />{l} <b className="text-ink">{summary[k]}</b></span>
          ))}
          {s.loading && <Spinner className="w-4 h-4 ml-auto" />}
        </div>
        {tab === "locations" ? (
          locations.length ? (
            <LocationsList locations={locations} assignments={assignments} shift={shift} selectedId={selectedId}
              onSelect={(id) => s.select(id === selectedId ? null : id)} onDrop={handleDrop} onRemove={removeAsg} onAdd={setAddFor} />
          ) : (
            <p className="text-sm text-mute text-center py-8">ยังไม่มีจุดเวร กด "เพิ่มจุด" แล้วคลิกบนแผนที่</p>
          )
        ) : (
          <PersonnelList staff={staff} byUser={byUser} />
        )}
      </section>

      {/* เลือกคนเข้าจุด (ใช้ได้ทั้งมือถือและคอม) */}
      <Modal open={!!addFor} onClose={() => setAddFor(null)} title={addFor ? `เพิ่มคนเข้า ${addFor.name}` : ""}>
        <p className="text-sm text-mute -mt-1 mb-3">กะ{SHIFT_INFO[shift].label} {fmtShort(date)}</p>
        <ul>
          {staff.map((u) => {
            const a = byUser[u.id];
            if (a && a.location_id === addFor?.id) return null;
            return (
              <li key={u.id}>
                <button onClick={() => { const loc = addFor; setAddFor(null); handleDrop(a ? { kind: "asg", id: a.id, name: u.name, locationId: a.location_id } : { kind: "user", userId: u.id, name: u.name }, loc); }}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-paper text-left">
                  <Avatar name={u.name} size={36} />
                  <span className="flex-1"><span className="block font-semibold">{u.name}</span><span className="block text-xs text-mute">{u.position}</span></span>
                  {a ? <span className="text-xs text-mute">ย้ายมาจาก {a.location_name}</span>
                     : <span className="text-xs font-semibold text-brand bg-brand-soft px-2 py-1 rounded-md">ว่าง</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>

      {/* เตือนเวรต่อกัน */}
      <Modal open={!!b2b} onClose={() => setB2b(null)} title="เวรต่อกันหลายกะ"
        footer={<>
          <Button onClick={() => setB2b(null)}>ไม่จัด</Button>
          <Button variant="dark" onClick={() => { const x = b2b; setB2b(null); handleDrop(x.item, x.loc, true); }}>จัดเวรต่อ</Button>
        </>}>
        <div className="flex gap-3">
          <span className="w-10 h-10 rounded-xl bg-warn-soft text-warn flex items-center justify-center shrink-0"><AlertTriangle size={20} /></span>
          <div className="text-sm">
            <p>{b2b?.item.name} มีเวรติดกับกะ{SHIFT_INFO[shift].label} {fmtShort(date)} อยู่แล้ว ถ้าจัดเพิ่มจะต้องทำงานต่อกันโดยไม่ได้พัก</p>
            <ul className="mt-2 text-mute">
              {b2b?.conflicts.map((c, i) => <li key={i}>• กะ{SHIFT_INFO[c.shift].label} {fmtShort(c.date)} ที่ {c.location_name}</li>)}
            </ul>
          </div>
        </div>
      </Modal>

      {/* ยืนยันคัดลอก */}
      <Modal open={!!copyMode} onClose={() => setCopyMode(null)} title={copyMode === "day" ? "คัดลอกเวรจากเมื่อวาน" : "คัดลอกเวรทั้งสัปดาห์"}
        footer={<><Button onClick={() => setCopyMode(null)}>ยกเลิก</Button><Button variant="dark" loading={busy} onClick={doCopy}>คัดลอก</Button></>}>
        <p className="text-sm">
          {copyMode === "day"
            ? <>คัดลอกเวรทุกกะของ <b>{fmtLong(addDays(date, -1))}</b> มาใส่ <b>{fmtLong(date)}</b></>
            : <>คัดลอกเวร 7 วันของสัปดาห์ <b>{fmtShort(addDays(ws, -7))} – {fmtShort(addDays(ws, -1))}</b> มาใส่สัปดาห์ <b>{fmtShort(ws)} – {fmtShort(addDays(ws, 6))}</b></>}
        </p>
        <p className="text-sm text-mute mt-2">คนที่มีเวรกะนั้นอยู่แล้ว หรือจุดที่คนครบแล้ว จะถูกข้าม</p>
      </Modal>

      {newLoc && (
        <AddLocationModal initial={newLoc} onClose={() => setNewLoc(null)}
          onSaved={async (loc) => { setNewLoc(null); await s.fetchBase(); s.select(loc.id); }} />
      )}
    </div>
  );
}

