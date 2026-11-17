import { Star } from "lucide-react";

// ตำแหน่งในทีม รปภ.
export const RANKS = {
  HEAD: { label: "หัวหน้า", icon: Star, cls: "bg-ink text-white" },
  DEPUTY: { label: "รองหัวหน้า", icon: Star, cls: "bg-brand-soft text-brand" },
  STAFF: { label: "เจ้าหน้าที่", icon: null, cls: "bg-paper text-mute" },
};
export const RANK_KEYS = ["HEAD", "DEPUTY", "STAFF"];
export const rankLabel = (rank) => (RANKS[rank] || RANKS.STAFF).label;
