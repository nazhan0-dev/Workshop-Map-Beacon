import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronRight as Go, Sun, Sunset, Moon, Check } from "lucide-react";
import { SHIFT_INFO, addDays, parseDate, toDateStr, today } from "../lib/shifts";

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const SHIFT_ICON = { MORNING: Sun, AFTERNOON: Sunset, NIGHT: Moon };

const monthOf = (s, n = 0) => { const d = parseDate(s); return toDateStr(new Date(d.getFullYear(), d.getMonth() + n, 1)); };
function gridOf(month) {
  const first = parseDate(month);
  const start = addDays(month, -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * ปุ่มวันที่/เวลา + ปฏิทินเวรของฉัน
 * items: เวรของฉัน [{ id, date, shift, location_name, acknowledged_at }]
 * trigger: เนื้อหาในปุ่ม (เช่น เวลา + วันที่)
 */
export default function ShiftCalendar({ items = [], trigger, className = "" }) {
  const now = today();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(now));
  const [slide, setSlide] = useState(0);
  const [picked, setPicked] = useState(now);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const byDate = {};
  items.forEach((a) => { (byDate[a.date] ||= []).push(a); });
  const toggle = () => { if (!open) { setMonth(monthOf(now)); setSlide(0); setPicked(now); } setOpen((v) => !v); };
  const shiftMonth = (n) => { setSlide(n); setMonth((m) => monthOf(m, n)); };
  const curMonth = parseDate(month).getMonth();
  const title = parseDate(month).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const slideCls = slide > 0 ? "slide-from-right" : slide < 0 ? "slide-from-left" : "";
  const dayShifts = byDate[picked] || [];
  const monthCount = items.filter((a) => parseDate(a.date).getMonth() === curMonth && a.date.slice(0, 4) === month.slice(0, 4)).length;

  return (
    <div ref={box} className={`relative ${className}`}>
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-label="ปฏิทินเวรของฉัน"
        className={`transition ${open ? "ring-2 ring-ink/15" : "hover:ring-2 hover:ring-ink/10"} rounded-2xl`}>
        {trigger || <span className="w-10 h-10 rounded-xl bg-paper flex items-center justify-center"><CalendarDays size={18} /></span>}
      </button>

      {open && (
        <div role="dialog" aria-label="ปฏิทินเวรของฉัน"
          className="cal-pop absolute right-0 top-[calc(100%+8px)] z-[1100] w-[288px] bg-white rounded-2xl border border-line shadow-[0_16px_40px_-12px_rgb(23_25_28/0.3)] p-3">
          <div className="flex items-center gap-1 mb-1">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อนหน้า" className="w-8 h-8 rounded-lg hover:bg-paper flex items-center justify-center"><ChevronLeft size={16} /></button>
            <div className="flex-1 text-center overflow-hidden">
              <span key={month} className={`inline-block text-sm font-semibold ${slideCls}`}>{title}</span>
              <div className="text-[11px] text-mute">{monthCount ? `มีเวร ${monthCount} ครั้ง` : "ไม่มีเวรในเดือนนี้"}</div>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป" className="w-8 h-8 rounded-lg hover:bg-paper flex items-center justify-center"><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w, i) => <span key={w} className={`text-center text-[10px] font-semibold py-1 ${i >= 5 ? "text-danger/70" : "text-faint"}`}>{w}</span>)}
          </div>
          <div key={month} className={`grid grid-cols-7 gap-0.5 ${slideCls}`}>
            {gridOf(month).map((d) => {
              const inMonth = parseDate(d).getMonth() === curMonth;
              const list = byDate[d] || [];
              const sel = d === picked, isToday = d === now;
              return (
                <button key={d} type="button" onClick={() => setPicked(d)} aria-label={`${parseDate(d).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}${list.length ? ` มีเวร ${list.length} กะ` : ""}`}
                  className={`relative h-9 rounded-lg text-[13px] flex flex-col items-center justify-center transition-colors
                    ${sel ? "bg-ink text-white font-semibold" : isToday ? "ring-1 ring-ink font-bold" : inMonth ? "hover:bg-paper" : "text-faint/60 hover:bg-paper"}
                    ${list.length && !sel ? "font-semibold" : ""}`}>
                  <span className="leading-none">{parseDate(d).getDate()}</span>
                  {list.length > 0 && (
                    <span className="flex gap-0.5 mt-1">
                      {list.slice(0, 3).map((a) => (
                        <i key={a.id} className={`w-1 h-1 rounded-full ${a.acknowledged_at ? (sel ? "bg-[#6fd3a0]" : "bg-brand") : "bg-warn"}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* เวรของวันที่เลือก */}
          <div className="border-t border-line mt-2.5 pt-2.5">
            <div className="text-xs font-semibold text-mute mb-1.5">
              {picked === now ? "วันนี้" : parseDate(picked).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short" })}
            </div>
            {dayShifts.length === 0 ? (
              <p className="text-xs text-faint py-1.5">ไม่มีเวร</p>
            ) : dayShifts.map((a) => {
              const Icon = SHIFT_ICON[a.shift];
              return (
                <Link key={a.id} to={`/me/map?id=${a.id}`} onClick={() => setOpen(false)}
                  className="row-in group flex items-center gap-2.5 px-2 py-2 -mx-1 rounded-xl hover:bg-paper transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-paper group-hover:bg-white flex items-center justify-center shrink-0"><Icon size={15} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">กะ{SHIFT_INFO[a.shift].label} <span className="text-xs text-mute font-normal">{SHIFT_INFO[a.shift].time}</span></span>
                    <span className="block text-xs text-mute truncate">{a.location_name}</span>
                  </span>
                  {a.acknowledged_at
                    ? <span className="w-5 h-5 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0"><Check size={11} strokeWidth={3} /></span>
                    : <span className="text-[10px] font-semibold text-warn bg-warn-soft rounded px-1.5 py-0.5 shrink-0">รอรับทราบ</span>}
                  <Go size={14} className="text-faint shrink-0" />
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-line text-[10px] text-mute">
            <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-brand" />รับทราบแล้ว</span>
            <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-warn" />รอรับทราบ</span>
          </div>
        </div>
      )}
    </div>
  );
}
