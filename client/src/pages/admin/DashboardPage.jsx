import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Clock, ChevronLeft, ChevronRight, ArrowRight, Users, MapPin, ClipboardCheck, BellRing,
  Sun, Sunset, Moon, AlertTriangle, UserX, PartyPopper,
} from "lucide-react";
import Header from "../../components/layout/Header";
import RankBadge from "../../components/RankBadge";
import DatePicker from "../../components/DatePicker";
import { Avatar, StatusDot } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { SHIFT_INFO, today, addDays } from "../../lib/shifts";

const SHIFT_ICON = { MORNING: Sun, AFTERNOON: Sunset, NIGHT: Moon };
const LIST_LIMIT = 6; // แสดงกี่แถวก่อนกด "ดูทั้งหมด"

// ตัวเลขนับขึ้นจาก 0 (หรือจากค่าเดิม) ไปถึงค่าใหม่
function useCountUp(value, duration = 700) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    if (reduce || start === value) { from.current = value; setShown(value); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

// การ์ดตัวเลขด้านบน
function Metric({ icon, tone, label, value, of, sub, delay }) {
  const Icon = icon;
  const n = useCountUp(value);
  const p = of != null ? pct(value, of) : null;
  const full = p === 100 && of > 0;
  return (
    <div className="dash-rise surface p-5 flex flex-col gap-3" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><Icon size={18} /></span>
        <span className="text-sm text-mute font-medium">{label}</span>
      </div>
      <div className="text-[32px] font-bold tracking-tight leading-none tabular-nums">
        {n}{of != null && <span className="text-lg text-faint font-semibold">/{of}</span>}
      </div>
      {p != null ? (
        <div>
          <div className="h-1.5 rounded-full bg-track overflow-hidden">
            <div className={`dash-bar h-full rounded-full ${full ? "bg-brand" : "bg-ink"}`} style={{ width: `${p}%`, animationDelay: `${delay + 0.2}s` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-mute">
            <span>{sub}</span><span className={`font-semibold ${full ? "text-brand" : "text-ink"}`}>{p}%</span>
          </div>
        </div>
      ) : <div className="text-xs text-mute">{sub}</div>}
    </div>
  );
}

function Card({ icon, title, aside, children, className = "", delay = 0 }) {
  const Icon = icon;
  return (
    <section className={`dash-rise surface px-5 py-5 ${className}`} style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-2.5 mb-3">
        {Icon && <span className="w-8 h-8 rounded-lg bg-paper flex items-center justify-center text-ink"><Icon size={16} /></span>}
        <h2 className="font-semibold flex-1">{title}</h2>
        <span className="text-sm text-mute">{aside}</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ icon, text }) {
  const Icon = icon;
  return (
    <div className="pop-in flex flex-col items-center gap-2 py-6 text-sm text-mute">
      <span className="w-11 h-11 rounded-2xl bg-brand-soft text-brand flex items-center justify-center"><Icon size={20} /></span>
      {text}
    </div>
  );
}

// รายการยาว: แสดงบางส่วน กด "ดูทั้งหมด" เพื่อกาง
function Collapsible({ items, render }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, LIST_LIMIT);
  return (
    <>
      {shown.map((it, i) => render(it, i))}
      {items.length > LIST_LIMIT && (
        <button onClick={() => setOpen((v) => !v)}
          className="w-full mt-2 h-9 rounded-xl text-[13px] font-semibold text-mute hover:text-ink hover:bg-paper transition-colors flex items-center justify-center gap-1.5">
          {open ? "ย่อ" : `ดูทั้งหมด (${items.length})`}
          <ChevronRight size={14} className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 px-3 md:px-0" aria-busy="true" aria-label="กำลังโหลด">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="surface h-[138px] skeleton" />)}
      </div>
      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-3">
        <div className="surface h-[300px] skeleton" />
        <div className="surface h-[300px] skeleton" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState(today());
  const [dir, setDir] = useState(1);
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

  const go = (d) => { setDir(d >= date ? 1 : -1); setDate(d); };
  const goAssign = (shift, loc) => navigate(`/admin/assign?date=${date}&shift=${shift}${loc ? `&loc=${loc}` : ""}`);
  const t = data?.totals;
  const ackDone = data ? data.acknowledgements.filter((a) => a.acknowledged_at).length : 0;

  return (
    <div className="h-full overflow-y-auto px-0 md:px-2 pb-6">
      <Header title={date === today() ? "ภาพรวมวันนี้" : "ภาพรวม"} subtitle="สรุปการจัดเวรและการรับทราบของเจ้าหน้าที่">
        <div className="flex items-center gap-1">
          <button onClick={() => go(addDays(date, -1))} aria-label="วันก่อนหน้า" className="group w-9 h-9 rounded-xl hover:bg-white flex items-center justify-center">
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
          </button>
          <DatePicker value={date} onChange={go} dir={dir} />
          <button onClick={() => go(addDays(date, 1))} aria-label="วันถัดไป" className="group w-9 h-9 rounded-xl hover:bg-white flex items-center justify-center">
            <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          {date !== today() && (
            <button onClick={() => go(today())} className="pop-in ml-1 h-9 px-3 rounded-xl bg-ink text-white text-[13px] font-semibold hover:bg-black">วันนี้</button>
          )}
        </div>
      </Header>

      {error && <p className="mx-4 md:mx-0 mb-3 text-sm text-danger">{error}</p>}
      {!data ? <Skeleton /> : (
        <div key={date} className="flex flex-col gap-3 px-3 md:px-0">
          {/* ตัวเลขสรุป */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric icon={Users} tone="bg-paper text-ink" label="พนักงาน" value={t.staff} sub="ใช้งานอยู่ทั้งหมด" delay={0} />
            <Metric icon={MapPin} tone="bg-paper text-ink" label="จุดเวร" value={t.locations} sub={`ต้องการ ${t.need} คนต่อวัน`} delay={0.05} />
            <Metric icon={ClipboardCheck} tone="bg-brand-soft text-brand" label="จัดเวรแล้ว" value={t.assigned} of={t.need}
              sub={t.need - t.assigned > 0 ? `ยังขาด ${t.need - t.assigned} ตำแหน่ง` : "ครบทุกตำแหน่ง"} delay={0.1} />
            <Metric icon={BellRing} tone="bg-warn-soft text-warn" label="รับทราบเวร" value={t.acknowledged} of={t.assigned}
              sub={t.assigned - t.acknowledged > 0 ? `รออีก ${t.assigned - t.acknowledged} คน` : "รับทราบครบแล้ว"} delay={0.15} />
          </div>

          <div className="grid lg:grid-cols-[1.25fr_1fr] gap-3 items-start">
            <div className="flex flex-col gap-3">
              {/* คนเข้าเวรแต่ละกะ: 1 ช่อง = 1 ตำแหน่ง */}
              <Card icon={ClipboardCheck} title="คนเข้าเวรแต่ละกะ" delay={0.2} aside={
                <span className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><i className="w-3 h-1.5 rounded-full bg-ink" />จัดแล้ว</span>
                  <span className="flex items-center gap-1.5"><i className="w-3 h-1.5 rounded-full bg-track" />ยังว่าง</span>
                </span>}>
                {data.perShift.map((p, r) => {
                  const Icon = SHIFT_ICON[p.shift];
                  const full = p.need > 0 && p.assigned >= p.need;
                  return (
                    <button key={p.shift} onClick={() => goAssign(p.shift)}
                      className="group w-full flex items-center gap-3 py-3 px-2 -mx-2 border-t border-line text-left hover:bg-paper/70 transition-colors">
                      <span className={`hidden sm:flex w-9 h-9 rounded-xl items-center justify-center shrink-0 ${full ? "bg-brand-soft text-brand" : "bg-paper text-ink"}`}><Icon size={17} /></span>
                      <div className="w-16 sm:w-24 shrink-0">
                        <div className="font-semibold">กะ{SHIFT_INFO[p.shift].label}</div>
                        <div className="text-xs text-mute">{SHIFT_INFO[p.shift].time}</div>
                      </div>
                      {/* แถบแบ่งช่อง: 1 ช่อง = 1 ตำแหน่ง (ถ้าเยอะเกินใช้แถบต่อเนื่อง) */}
                      <div className="flex-1 min-w-0" role="img" aria-label={`จัดแล้ว ${p.assigned} จาก ${p.need}`}>
                        {Math.max(p.need, p.assigned) <= 24 ? (
                          <div className="flex gap-1">
                            {Array.from({ length: Math.max(p.need, p.assigned) }, (_, i) => (
                              <span key={i} className="flex-1 h-2.5 rounded-full bg-track overflow-hidden">
                                {i < p.assigned && (
                                  <span className={`seg-fill block h-full rounded-full ${full ? "bg-brand" : "bg-ink"}`}
                                    style={{ animationDelay: `${0.35 + r * 0.1 + i * 0.05}s` }} />
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="h-2.5 rounded-full bg-track overflow-hidden">
                            <div className={`dash-bar h-full rounded-full ${full ? "bg-brand" : "bg-ink"}`}
                              style={{ width: `${pct(p.assigned, p.need)}%`, animationDelay: `${0.35 + r * 0.1}s` }} />
                          </div>
                        )}
                        <div className="text-[11px] text-mute mt-1.5">
                          {full ? "ครบทุกตำแหน่ง" : `ว่างอีก ${p.need - p.assigned} ตำแหน่ง`}
                        </div>
                      </div>
                      <div className="w-12 sm:w-16 text-right shrink-0">
                        <div className="font-semibold text-sm">{p.assigned}<span className="text-faint font-medium">/{p.need}</span></div>
                        <div className="text-[11px] text-mute group-hover:hidden">{pct(p.assigned, p.need)}%</div>
                        <div className="text-[11px] font-semibold text-ink hidden group-hover:flex items-center justify-end gap-0.5">ไปจัดเวร<ArrowRight size={11} /></div>
                      </div>
                    </button>
                  );
                })}
              </Card>

              {/* จุดที่ยังขาดคน */}
              <Card icon={AlertTriangle} title="จุดที่ยังขาดคน" aside={`${data.understaffed.length} รายการ`} delay={0.25}>
                {data.understaffed.length === 0 ? <Empty icon={PartyPopper} text="ทุกจุดมีคนครบแล้ว" /> : (
                  <Collapsible items={data.understaffed} render={(u, i) => {
                    const empty = !u.assigned;
                    return (
                      <div key={`${u.location_id}-${u.shift}`} style={{ animationDelay: `${0.3 + Math.min(i, 8) * 0.04}s` }}
                        className="row-in group flex items-center gap-3 py-2.5 border-t border-line first:border-t-0">
                        <StatusDot status={empty ? "empty" : "low"} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{u.location_name}</div>
                          <div className="text-xs text-mute">กะ{SHIFT_INFO[u.shift].label} · มี {u.assigned}/{u.need} คน</div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${empty ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                          ขาด {u.need - u.assigned}
                        </span>
                        <button onClick={() => goAssign(u.shift, u.location_id)}
                          className="h-8 pl-3 pr-2.5 rounded-lg border border-line text-[13px] font-semibold flex items-center gap-1 hover:bg-ink hover:text-white hover:border-ink transition-colors">
                          จัดเวร<ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    );
                  }} />
                )}
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              {/* ยังไม่มีเวร */}
              <Card icon={UserX} title="ยังไม่มีเวรวันนี้" aside={`${data.freeStaff.length} คน`} delay={0.3}>
                {data.freeStaff.length === 0 ? <Empty icon={Check} text="ทุกคนมีเวรแล้ว" /> : data.freeStaff.map((u, i) => (
                  <div key={u.id} style={{ animationDelay: `${0.35 + Math.min(i, 8) * 0.04}s` }}
                    className="row-in flex items-center gap-3 py-2.5 border-t border-line first:border-t-0">
                    <Avatar name={u.name} size={34} />
                    <div className="flex-1 min-w-0 font-semibold truncate">{u.name}</div>
                    <RankBadge rank={u.rank} size="md" />
                  </div>
                ))}
              </Card>

              {/* การรับทราบเวร */}
              <Card icon={BellRing} title="การรับทราบเวร" aside={`${ackDone}/${data.acknowledgements.length} รับทราบ`} delay={0.35}>
                {data.acknowledgements.length === 0 ? <Empty icon={Clock} text="ยังไม่มีเวรในวันนี้" /> : (
                  <>
                    <div className="h-1.5 rounded-full bg-track overflow-hidden mb-3">
                      <div className="dash-bar h-full rounded-full bg-brand" style={{ width: `${pct(ackDone, data.acknowledgements.length)}%`, animationDelay: "0.5s" }} />
                    </div>
                    <Collapsible items={data.acknowledgements} render={(a, i) => (
                      <div key={a.id} style={{ animationDelay: `${0.4 + Math.min(i, 8) * 0.04}s` }}
                        className="row-in flex items-center gap-3 py-2.5 border-t border-line first:border-t-0">
                        <Avatar name={a.user_name} size={34} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{a.user_name}</div>
                          <div className="text-xs text-mute truncate">กะ{SHIFT_INFO[a.shift].label} · {a.location_name}</div>
                        </div>
                        {a.acknowledged_at
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-brand bg-brand-soft rounded-md px-2 py-1"><Check size={13} />รับทราบแล้ว</span>
                          : <span className="flex items-center gap-1 text-xs font-semibold text-warn bg-warn-soft rounded-md px-2 py-1"><Clock size={13} />ยังไม่เปิดดู</span>}
                      </div>
                    )} />
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
