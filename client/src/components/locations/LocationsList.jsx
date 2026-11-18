import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Avatar, StatusDot } from "../ui";
import { needOf, statusOf } from "../../lib/shifts";
import { drag } from "../../lib/drag";
import { RankDot } from "../RankBadge";
import AttendanceChip from "../attendance/AttendanceChip";

/**
 * รายการจุดเวรของกะที่เลือก ลากพนักงานมาวางที่แถวได้
 * onDrop(item, location)  item จาก lib/drag
 */
export default function LocationsList({ locations, assignments, shift, selectedId, onSelect, onDrop, onRemove, onAdd }) {
  const [over, setOver] = useState(null);

  return (
    <ul>
      {locations.map((loc, i) => {
        const people = assignments.filter((a) => a.location_id === loc.id);
        const need = needOf(loc, shift);
        const status = statusOf(people.length, need);
        const selected = loc.id === selectedId;
        const isOver = over === loc.id;
        const dragging = drag.get();
        const full = people.length >= need;

        const dropProps = {
          onDragOver: (e) => { e.preventDefault(); setOver(loc.id); },
          onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); },
          onDrop: (e) => { e.preventDefault(); setOver(null); const it = drag.get(); drag.end(); if (it) onDrop(it, loc); },
        };

        return (
          <li key={loc.id} {...dropProps} style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
            className={`row-in transition-all duration-200 ${selected || isOver ? "bg-paper rounded-2xl my-1.5" : "border-b border-line hover:bg-paper/60 hover:rounded-xl"} ${isOver ? (full ? "ring-2 ring-danger/50" : "ring-2 ring-brand/60") : ""}`}>
            <button onClick={() => onSelect(loc.id)} className="group w-full flex items-center gap-3 px-3 py-3.5 text-left">
              <StatusDot status={status} />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{loc.name}</span>
                <span className="block text-xs text-mute">ต้องการ {need} คน</span>
              </span>
              {!selected && (
                <span className="avatar-stack flex items-center">
                  {people.length ? (
                    <>
                      {people.slice(0, 3).map((p, i) => (
                        <span key={p.id} className={`relative rounded-full ring-2 ring-white transition-transform duration-200 ${i ? "-ml-2" : ""}`}
                          style={{ zIndex: 3 - i }}>
                          <Avatar name={p.user_name} size={28} title={p.user_name} />
                        </span>
                      ))}
                      {people.length > 3 && (
                        <span className="-ml-2 relative w-7 h-7 rounded-full ring-2 ring-white bg-ink text-white text-[10px] font-bold flex items-center justify-center"
                          title={people.slice(3).map((p) => p.user_name).join(", ")}>
                          +{people.length - 3}
                        </span>
                      )}
                    </>
                  ) : <span className="text-xs text-mute">ยังไม่มีคน</span>}
                </span>
              )}
              <span key={people.length} className="pop-in text-sm font-semibold w-8 text-right">{people.length}/{need}</span>
            </button>

            {(selected || isOver) && (
              <div className="expand-in px-3 pb-3 flex flex-col gap-3">
                {people.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {people.map((p) => (
                      <span key={p.id} draggable
                        onDragStart={(e) => drag.start(e, { kind: "asg", id: p.id, name: p.user_name, locationId: loc.id })}
                        onDragEnd={drag.end}
                        title="ลากไปจุดอื่นเพื่อย้าย"
                        className="inline-flex items-center gap-2 h-[34px] pl-1 pr-2 rounded-full bg-white border border-line text-[13px] font-semibold cursor-grab active:cursor-grabbing">
                        <span className="relative"><Avatar name={p.user_name} size={26} /><RankDot rank={p.user_rank} /></span>
                        {p.user_name.split(" ")[0]}
                        <AttendanceChip a={p} quiet className="text-[10px] px-1 py-0" />
                        <button onClick={() => onRemove(p)} aria-label={`ถอน ${p.user_name} ออก`} className="text-faint hover:text-danger"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {isOver && dragging ? (
                  <div className={`h-10 rounded-xl border-[1.5px] border-dashed flex items-center justify-center gap-2 text-[13px] font-semibold ${full ? "border-danger bg-danger-soft text-danger" : "border-brand bg-brand-soft text-brand"}`}>
                    {full ? `จุดนี้ครบ ${need} คนแล้ว` : <><Plus size={16} />ปล่อยเพื่อ{dragging.kind === "asg" ? "ย้าย" : "เพิ่ม"} {dragging.name}</>}
                  </div>
                ) : !full ? (
                  <button onClick={() => onAdd(loc)}
                    className="h-10 rounded-xl border-[1.5px] border-dashed border-line text-mute hover:border-ink hover:text-ink flex items-center justify-center gap-2 text-[13px] font-semibold">
                    <Plus size={16} />เพิ่มคน หรือลากพนักงานมาวางที่นี่
                  </button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
