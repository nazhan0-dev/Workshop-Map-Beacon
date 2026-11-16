import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, Clock } from "lucide-react";
import Header from "../../components/layout/Header";
import { Avatar, StatusDot, Spinner, Button } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { SHIFT_INFO, today, fmtLong } from "../../lib/shifts";

function Metric({ label, value, of, sub }) {
  return (
    <div className="flex-1 min-w-[150px] px-6 py-5 border-line [&+&]:border-l">
      <div className="text-sm text-mute">{label}</div>
      <div className="text-[34px] font-semibold tracking-tight leading-tight">
        {value}{of != null && <small className="text-lg text-faint font-medium">/{of}</small>}
      </div>
      <div className="text-xs text-mute">{sub}</div>
    </div>
  );
}

function Card({ title, aside, children, className = "" }) {
  return (
    <section className={`surface px-6 py-5 ${className}`}>
      <div className="flex items-center mb-2"><h2 className="font-semibold flex-1">{title}</h2><span className="text-sm text-mute">{aside}</span></div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api.get("/dashboard", { date })
      .then((d) => { if (alive) { setData(d); setError(""); } })
      .catch((e) => alive && setError(errMsg(e)));
    return () => { alive = false; };
  }, [date]);

  const goAssign = (shift, loc) => navigate(`/admin/assign?date=${date}&shift=${shift}${loc ? `&loc=${loc}` : ""}`);

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title={date === today() ? "ภาพรวมวันนี้" : "ภาพรวม"}>
        <label className="relative h-10 px-4 rounded-xl border border-line bg-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
          <CalendarDays size={16} />{fmtLong(date)}
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="เลือกวันที่" />
        </label>
      </Header>

      {error && <p className="mx-4 md:mx-0 mb-3 text-sm text-danger">{error}</p>}
      {!data ? <div className="py-20 flex justify-center"><Spinner /></div> : (
        <div className="flex flex-col gap-3 px-3 md:px-0">
          <div className="surface flex flex-wrap">
            <Metric label="พนักงาน" value={data.totals.staff} sub="ใช้งานอยู่ทั้งหมด" />
            <Metric label="จุดเวร" value={data.totals.locations} sub={`ต้องการ ${data.totals.need} คนต่อวัน`} />
            <Metric label="จัดเวรแล้ว" value={data.totals.assigned} of={data.totals.need} sub={`ยังขาด ${Math.max(0, data.totals.need - data.totals.assigned)} ตำแหน่ง`} />
            <Metric label="รับทราบเวร" value={data.totals.acknowledged} of={data.totals.assigned} sub={`รออีก ${data.totals.assigned - data.totals.acknowledged} คน`} />
          </div>

          <div className="grid lg:grid-cols-[1.25fr_1fr] gap-3">
            <div className="flex flex-col gap-3">
              <Card title="คนเข้าเวรแต่ละกะ" aside={
                <span className="flex gap-3 text-xs"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] bg-ink" />จัดแล้ว</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] border border-line" />ยังว่าง</span></span>}>
                {data.perShift.map((p) => (
                  <button key={p.shift} onClick={() => goAssign(p.shift)} className="w-full flex items-center gap-3 py-3 border-t border-line text-left hover:bg-paper/60">
                    <div className="w-20 sm:w-28 shrink-0"><div className="font-semibold">กะ{SHIFT_INFO[p.shift].label}</div><div className="text-xs text-mute">{SHIFT_INFO[p.shift].time}</div></div>
                    {/* 1 ช่อง = 1 ตำแหน่ง */}
                    <div className="flex-1 flex flex-wrap gap-[5px]" aria-label={`จัดแล้ว ${p.assigned} จาก ${p.need}`}>
                      {Array.from({ length: Math.max(p.need, p.assigned) }, (_, i) => (
                        <i key={i} className={`w-[22px] h-[22px] rounded-md ${i < p.assigned ? "bg-ink" : "border-[1.5px] border-line"}`} />
                      ))}
                    </div>
                    <div className="font-semibold text-sm w-14 text-right">{p.assigned}<span className="text-faint font-medium">/{p.need}</span></div>
                  </button>
                ))}
              </Card>

              <Card title="จุดที่ยังขาดคน" aside={`${data.understaffed.length} รายการ`} className="flex-1">
                {data.understaffed.length === 0 && <p className="text-sm text-mute py-4">ทุกจุดมีคนครบแล้ว</p>}
                {data.understaffed.map((u) => (
                  <div key={`${u.location_id}-${u.shift}`} className="flex items-center gap-3 py-2.5 border-t border-line">
                    <StatusDot status={u.assigned ? "low" : "empty"} />
                    <div className="flex-1 min-w-0"><div className="font-semibold truncate">{u.location_name}</div><div className="text-xs text-mute">กะ{SHIFT_INFO[u.shift].label}</div></div>
                    <span className="text-sm text-mute">ขาด {u.need - u.assigned} คน</span>
                    <Button className="h-[34px] px-3 text-[13px]" onClick={() => goAssign(u.shift, u.location_id)}>จัดเวร</Button>
                  </div>
                ))}
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              <Card title="ยังไม่มีเวรวันนี้" aside={`${data.freeStaff.length} คน`}>
                {data.freeStaff.length === 0 && <p className="text-sm text-mute py-4">ทุกคนมีเวรแล้ว</p>}
                {data.freeStaff.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-2.5 border-t border-line">
                    <Avatar name={u.name} size={34} /><div className="flex-1 font-semibold">{u.name}</div><span className="text-xs text-mute">{u.position}</span>
                  </div>
                ))}
              </Card>

              <Card title="การรับทราบเวร" aside={`${data.acknowledgements.length} เวร`} className="flex-1">
                {data.acknowledgements.length === 0 && <p className="text-sm text-mute py-4">ยังไม่มีเวรในวันนี้</p>}
                {data.acknowledgements.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 border-t border-line">
                    <Avatar name={a.user_name} size={34} />
                    <div className="flex-1 min-w-0"><div className="font-semibold truncate">{a.user_name}</div><div className="text-xs text-mute truncate">กะ{SHIFT_INFO[a.shift].label} · {a.location_name}</div></div>
                    {a.acknowledged_at
                      ? <span className="flex items-center gap-1.5 text-[13px] text-brand"><Check size={15} />รับทราบแล้ว</span>
                      : <span className="flex items-center gap-1.5 text-[13px] text-mute"><Clock size={15} className="text-warn" />ยังไม่เปิดดู</span>}
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
