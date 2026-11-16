import { Avatar } from "../ui";
import { drag } from "../../lib/drag";

/**
 * รายชื่อพนักงานในกะที่เลือก ลากไปวางที่จุดได้
 * byUser: { [userId]: assignment }  คนที่มีเวรกะนี้แล้ว
 */
export default function PersonnelList({ staff, byUser, onPick }) {
  if (!staff.length) return <p className="text-sm text-mute py-6 text-center">ยังไม่มีพนักงาน เพิ่มได้ที่เมนูพนักงาน</p>;
  return (
    <ul>
      {staff.map((u) => {
        const a = byUser[u.id];
        return (
          <li key={u.id} draggable
            onDragStart={(e) => drag.start(e, a ? { kind: "asg", id: a.id, name: u.name, locationId: a.location_id } : { kind: "user", userId: u.id, name: u.name })}
            onDragEnd={drag.end}
            onClick={() => onPick?.(u)}
            className="flex items-center gap-3 px-3 py-3 border-b border-line cursor-grab active:cursor-grabbing hover:bg-paper rounded-xl">
            <Avatar name={u.name} size={36} />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold truncate">{u.name}</span>
              <span className="block text-xs text-mute">{u.position || "เจ้าหน้าที่"}</span>
            </span>
            {a
              ? <span className="text-xs text-mute truncate max-w-[110px]">{a.location_name}</span>
              : <span className="text-xs font-semibold text-brand bg-brand-soft px-2 py-1 rounded-md">ว่าง</span>}
          </li>
        );
      })}
    </ul>
  );
}

// แถบพนักงานว่างที่ลอยอยู่บนแผนที่
export function FreeTray({ free }) {
  return (
    <div className="flex items-center gap-3 max-w-[calc(100%-120px)]">
      <div className="shrink-0">
        <div className="text-sm font-semibold">พนักงานว่าง</div>
        <div className="text-xs text-mute">{free.length ? "ลากไปวางที่จุด" : "จัดครบทุกคนแล้ว"}</div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {free.map((u) => (
          <span key={u.id} draggable
            onDragStart={(e) => drag.start(e, { kind: "user", userId: u.id, name: u.name })}
            onDragEnd={drag.end}
            className="inline-flex items-center gap-2 h-10 pl-1 pr-3 rounded-full bg-white border border-line text-[13px] font-semibold whitespace-nowrap cursor-grab active:cursor-grabbing hover:border-ink">
            <Avatar name={u.name} size={30} />{u.name}
          </span>
        ))}
      </div>
    </div>
  );
}
