import { Star } from "lucide-react";
import { RANKS, rankLabel } from "../lib/rank";

// ป้ายตำแหน่ง ถ้าเป็นเจ้าหน้าที่ธรรมดาและ quiet=true จะไม่แสดงอะไร
export default function RankBadge({ rank = "STAFF", quiet = false, size = "sm", className = "" }) {
  const r = RANKS[rank] || RANKS.STAFF;
  if (quiet && rank === "STAFF") return null;
  const Icon = r.icon;
  const sz = size === "md" ? "text-xs px-2 py-1 gap-1" : "text-[11px] px-1.5 py-0.5 gap-0.5";
  return (
    <span className={`inline-flex items-center font-semibold rounded-md shrink-0 ${sz} ${r.cls} ${className}`}>
      {Icon && <Icon size={size === "md" ? 12 : 10} fill="currentColor" strokeWidth={0} aria-hidden />}
      {r.label}
    </span>
  );
}

// ดาวเล็กมุมรูปโปรไฟล์ (ใช้ในชิปที่พื้นที่น้อย)
export function RankDot({ rank }) {
  if (rank !== "HEAD" && rank !== "DEPUTY") return null;
  return (
    <span title={rankLabel(rank)}
      className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white flex items-center justify-center ${rank === "HEAD" ? "bg-ink text-white" : "bg-brand text-white"}`}>
      <Star size={8} fill="currentColor" strokeWidth={0} aria-hidden />
    </span>
  );
}
