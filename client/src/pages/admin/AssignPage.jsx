import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, Copy, Plus, X, AlertTriangle, CalendarDays, CalendarRange, Info } from "lucide-react";
import useDutyStore from "../../store/useDutyStore";
import { toast } from "../../store/useToast";
import { errMsg } from "../../lib/api";
import { SHIFTS, SHIFT_INFO, needOf, statusOf, addDays, weekStart, fmtShort, fmtLong } from "../../lib/shifts";
import { Button, Segmented, Tabs, Modal, Avatar, StatusDot, Spinner } from "../../components/ui";
import MapView, { ZoomControls, MapOverlay } from "../../components/map/MapView";
import LocationsList from "../../components/locations/LocationsList";
import PersonnelList, { FreeTray } from "../../components/people/PersonnelList";
import AddLocationModal from "../../components/locations/AddLocationModal";
import DatePicker from "../../components/DatePicker";

// พื้นที่ที่ปุ่มด้านบนและแถบพนักงานว่างด้านล่างบังแผนที่ (px)
const MAP_INSETS = { top: 56, bottom: 90 };

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
  const copyBox = useRef(null);

  // เมนูคัดลอก: ปิดเมื่อคลิกข้างนอก / Esc ยังยกเลิกโหมดวางจุดด้วย
  useEffect(() => {
    if (!copyOpen && !picking) return;
    const onDown = (e) => { if (copyOpen && !copyBox.current?.contains(e.target)) setCopyOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setCopyOpen(false); setPicking(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [copyOpen, picking]);
  const [dateDir, setDateDir] = useState(1); // ทิศที่วันที่เลื่อนเข้ามา (1 = ไปข้างหน้า)
  const goDate = (d) => { setDateDir(d >= date ? 1 : -1); s.setDate(d); };

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

  // ชื่อคนที่จัดแล้วในแต่ละจุด
  const peopleByLoc = useMemo(() => {
    const p = {};
    assignments.forEach((a) => { (p[a.location_id] ||= []).push(a.user_name); });
    return p;
  }, [assignments]);
  const countOf = (id) => peopleByLoc[id]?.length || 0;

  const summary = { ok: 0, low: 0, empty: 0 };
  locations.forEach((l) => { const st = statusOf(countOf(l.id), needOf(l, shift)); if (st in summary) summary[st]++; });

  const markers = locations.map((l) => {
    const count = countOf(l.id), need = needOf(l, shift);
    return {
      id: l.id, lat: l.lat, lng: l.lng, name: l.name,
      status: statusOf(count, need), label: `${count}/${need}`,
      count, need, people: peopleByLoc[l.id] || [],
    };
  });

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
          <button onClick={() => goDate(addDays(date, -1))} aria-label="วันก่อนหน้า"
            className="group w-9 h-9 rounded-xl hover:bg-paper flex items-center justify-center">
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5 group-active:-translate-x-1" />
          </button>
          <DatePicker value={date} onChange={goDate} dir={dateDir} />
          <button onClick={() => goDate(addDays(date, 1))} aria-label="วันถัดไป"
            className="group w-9 h-9 rounded-xl hover:bg-paper flex items-center justify-center">
            <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5 group-active:translate-x-1" />
          </button>
        </div>
        <Segmented options={shiftOptions} value={shift} onChange={s.setShift} />
        <Tabs value={tab} onChange={setTab}
          tabs={[{ value: "locations", label: "จุดเวร", count: locations.length }, { value: "people", label: "พนักงาน", count: staff.length }]} />
      </section>

      {/* แผนที่ */}
      <section className="relative overflow-hidden md:rounded-3xl md:surface md:col-start-2 md:row-start-1 md:row-span-2">
        <MapView markers={markers} selectedId={selectedId} onSelect={(id) => { s.select(id); setTab("locations"); }}
          picking={picking} onPick={(lat, lng) => { setPicking(false); setNewLoc({ lat: lat.toFixed(6), lng: lng.toFixed(6) }); }}
          fitKey={locations.length ? "loaded" : "init"} insets={MAP_INSETS}>
          <ZoomControls />
          <MapOverlay className="absolute right-3 top-3 md:right-4 md:top-4 z-[500] flex gap-2">
            <div className="relative" ref={copyBox}>
              <Button aria-haspopup="menu" aria-expanded={copyOpen} onClick={() => { setPicking(false); setCopyOpen((v) => !v); }}
                className={`group shadow-sm ${copyOpen ? "!border-ink !bg-white" : ""}`}>
                <Copy size={16} className="transition-transform group-hover:-rotate-6" />
                <span className="hidden sm:inline">คัดลอกเวร</span>
                <ChevronDown size={14} className={`hidden sm:block -ml-0.5 text-mute transition-transform duration-200 ${copyOpen ? "rotate-180" : ""}`} />
              </Button>
              {copyOpen && (
                <div role="menu" className="cal-pop absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-[0_16px_40px_-12px_rgb(23_25_28/0.3)] border border-line p-1.5">
                  {[
                    { mode: "day", icon: CalendarDays, title: "จากเมื่อวาน", sub: `ทุกกะของ ${fmtShort(addDays(date, -1))} → ${fmtShort(date)}` },
                    { mode: "week", icon: CalendarRange, title: "ทั้งสัปดาห์จากสัปดาห์ก่อน", sub: `7 วัน → ${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}` },
                  ].map((o, i) => (
                    <button key={o.mode} role="menuitem" onClick={() => { setCopyOpen(false); setCopyMode(o.mode); }}
                      className="row-in group w-full flex items-center gap-3 text-left px-2.5 py-2.5 rounded-xl hover:bg-paper transition-colors"
                      style={{ animationDelay: `${0.04 + i * 0.05}s` }}>
                      <span className="w-9 h-9 rounded-xl bg-paper group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                        <o.icon size={17} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold">{o.title}</span>
                        <span className="block text-xs text-mute mt-0.5">{o.sub}</span>
                      </span>
                      <ChevronRight size={15} className="text-faint transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="dark" onClick={() => { setCopyOpen(false); setPicking((v) => !v); }}
              className={`group ${picking ? "!bg-white !text-ink !border-line" : ""}`}>
              {picking
                ? <><X size={16} />ยกเลิก</>
                : <><Plus size={16} className="transition-transform duration-200 group-hover:rotate-90" /><span className="hidden sm:inline">เพิ่มจุด</span></>}
            </Button>
          </MapOverlay>
          {picking && (
            <MapOverlay className="cal-pop absolute left-1/2 -translate-x-1/2 top-16 md:left-4 md:translate-x-0 md:top-4 z-[500] bg-ink text-white text-sm font-semibold pl-3 pr-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inset-0 rounded-full bg-[#3ec482] animate-ping opacity-75" />
                <span className="relative w-2.5 h-2.5 rounded-full bg-[#3ec482]" />
              </span>
              คลิกบนแผนที่เพื่อวางจุดเวรใหม่
              <kbd className="ml-1 text-[11px] font-semibold text-white/60 border border-white/20 rounded px-1.5 py-0.5">Esc ยกเลิก</kbd>
            </MapOverlay>
          )}
          <MapOverlay className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-4 z-[500] w-max max-w-[calc(100%-140px)]">
            <FreeTray free={free} />
          </MapOverlay>
        </MapView>
      </section>

      {/* รายการ */}
      <section className="bg-white rounded-t-3xl -mt-5 md:mt-0 relative z-[600] md:z-auto md:rounded-t-none md:rounded-b-3xl md:col-start-1 md:row-start-2 min-h-0 overflow-y-auto px-3 md:px-3 pb-4 shadow-[0_-6px_24px_rgb(23_25_28/0.08)] md:shadow-none">
        <div className="md:hidden w-9 h-1 rounded bg-line mx-auto my-2.5" />
        <div className="flex items-center gap-4 px-2 py-3 text-[13px] text-mute">
          {[["ok", "ครบ"], ["low", "ขาด"], ["empty", "ว่าง"]].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5"><StatusDot status={k} />{l} <b key={summary[k]} className="pop-in inline-block text-ink">{summary[k]}</b></span>
          ))}
          {s.loading && <Spinner className="w-4 h-4 ml-auto" />}
        </div>
        {tab === "locations" ? (
          locations.length ? (
            <LocationsList key={`${date}-${shift}`} locations={locations} assignments={assignments} shift={shift} selectedId={selectedId}
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
        <div className="flex gap-2.5 mt-3 text-[13px] text-mute bg-paper rounded-xl px-3 py-2.5">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>เวรที่มีอยู่แล้วจะไม่ถูกลบ ระบบจะเพิ่มเฉพาะเวรที่ยังว่าง โดยข้ามคนที่มีเวรกะนั้นอยู่แล้ว และจุดที่คนครบแล้ว</span>
        </div>
      </Modal>

      {newLoc && (
        <AddLocationModal initial={newLoc} onClose={() => setNewLoc(null)}
          onSaved={async (loc) => { setNewLoc(null); await s.fetchBase(); s.select(loc.id); }} />
      )}
    </div>
  );
}

