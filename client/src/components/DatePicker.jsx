import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fmtShort, parseDate, toDateStr, today } from "../lib/shifts";

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

// วันแรกของเดือน (YYYY-MM-01) ที่ห่างจากเดือนของ s ไป n เดือน
function monthOf(s, n = 0) {
  const d = parseDate(s);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

// 6 สัปดาห์ เริ่มวันจันทร์
function gridOf(month) {
  const first = parseDate(month);
  const start = addDays(month, -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * ปุ่มวันที่ + ปฏิทินแบบป๊อปอัป
 * value / onChange ใช้รูปแบบ "YYYY-MM-DD"
 * dir: ทิศที่วันที่เพิ่งเลื่อนมา (1 = ไปข้างหน้า) ใช้ทำอนิเมชันข้อความบนปุ่ม
 */
export default function DatePicker({ value, onChange, dir = 1 }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(value));
  const [slide, setSlide] = useState(0);
  const box = useRef(null);

  // ปิดเมื่อคลิกข้างนอก หรือกด Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    if (!open) { setMonth(monthOf(value)); setSlide(0); }
    setOpen((v) => !v);
  };
  const shiftMonth = (n) => { setSlide(n); setMonth((m) => monthOf(m, n)); };
  const pick = (d) => { onChange(d); setOpen(false); };

  const now = today();
  const curMonth = parseDate(month).getMonth();
  const title = parseDate(month).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const slideCls = slide > 0 ? "slide-from-right" : slide < 0 ? "slide-from-left" : "";

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open}
        className={`h-9 px-3 rounded-xl border bg-white text-sm font-semibold flex items-center gap-2 overflow-hidden transition
          ${open ? "border-ink shadow-[0_0_0_3px_rgb(23_25_28/0.08)]" : "border-line hover:border-ink/30"}`}>
        <CalendarDays size={16} />
        <span key={value} className={`inline-block ${dir > 0 ? "slide-from-right" : "slide-from-left"}`}>{fmtShort(value)}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="เลือกวันที่"
          className="cal-pop absolute right-0 top-[calc(100%+8px)] z-[1100] w-[236px] bg-white rounded-xl border border-line shadow-[0_12px_32px_-10px_rgb(23_25_28/0.25)] p-2">
          {/* หัว: เดือน ปี + เลื่อนเดือน */}
          <div className="flex items-center gap-1 mb-1">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อนหน้า"
              className="group w-7 h-7 rounded-md hover:bg-paper flex items-center justify-center">
              <ChevronLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="flex-1 text-center overflow-hidden">
              <span key={month} className={`inline-block text-[13px] font-semibold ${slideCls}`}>{title}</span>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป"
              className="group w-7 h-7 rounded-md hover:bg-paper flex items-center justify-center">
              <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* ชื่อวัน */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={`text-center text-[10px] font-semibold py-0.5 ${i >= 5 ? "text-danger/70" : "text-faint"}`}>{w}</span>
            ))}
          </div>

          {/* วันในเดือน */}
          <div key={month} className={`grid grid-cols-7 gap-0.5 ${slideCls}`}>
            {gridOf(month).map((d) => {
              const inMonth = parseDate(d).getMonth() === curMonth;
              const sel = d === value;
              const isToday = d === now;
              return (
                <button key={d} type="button" onClick={() => pick(d)} aria-label={fmtShort(d)} aria-current={isToday ? "date" : undefined}
                  className={`relative h-7 rounded-md text-xs transition-colors
                    ${sel ? "bg-ink text-white font-semibold shadow-[0_3px_8px_rgb(23_25_28/0.25)] cal-sel"
                      : isToday ? "text-brand font-bold hover:bg-brand-soft"
                      : inMonth ? "text-ink hover:bg-paper" : "text-faint/60 hover:bg-paper"}`}>
                  {parseDate(d).getDate()}
                  {isToday && !sel && <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-1 h-1 rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>

          {/* ทางลัด */}
          <div className="flex gap-1 mt-2 pt-2 border-t border-line">
            {[["เมื่อวาน", -1], ["วันนี้", 0], ["พรุ่งนี้", 1]].map(([l, n]) => {
              const d = addDays(now, n);
              return (
                <button key={l} type="button" onClick={() => pick(d)}
                  className={`flex-1 h-7 rounded-md text-xs font-semibold transition-colors
                    ${d === value ? "bg-brand-soft text-brand" : "bg-paper text-mute hover:text-ink hover:bg-track"}`}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
