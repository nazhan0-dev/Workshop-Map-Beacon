import { LEAVE_TYPES, LEAVE_STATUS } from "../../lib/leaves";

export function LeaveTypeChip({ type, className = "" }) {
  const T = LEAVE_TYPES[type] || LEAVE_TYPES.PERSONAL;
  const Icon = T.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${T.chip} ${className}`}>
      <Icon size={11} strokeWidth={2.5} aria-hidden />{T.label}
    </span>
  );
}

export function LeaveStatusChip({ status }) {
  const S = LEAVE_STATUS[status] || LEAVE_STATUS.PENDING;
  return <span className={`text-[11px] font-semibold rounded-md px-1.5 py-0.5 shrink-0 ${S.chip}`}>{S.label}</span>;
}

// ป้ายเล็กในรายชื่อหน้าจัดเวร: "ลา" (อนุมัติแล้ว) / "ขอลา" (รออนุมัติ)
export function OnLeaveTag({ leave }) {
  if (!leave) return null;
  const approved = leave.status === "APPROVED";
  return (
    <span title={`${LEAVE_TYPES[leave.type]?.label} · ${approved ? "อนุมัติแล้ว" : "รออนุมัติ"}`}
      className={`text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 ${approved ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
      {approved ? LEAVE_TYPES[leave.type]?.label : "ขอลา"}
    </span>
  );
}
