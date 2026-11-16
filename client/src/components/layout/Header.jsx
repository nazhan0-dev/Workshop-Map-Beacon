// หัวหน้าเพจ: ชื่อหน้า + ปุ่มด้านขวา
export default function Header({ title, subtitle, children }) {
  return (
    <div className="flex items-center gap-3 flex-wrap px-4 pt-5 pb-3 md:px-1 md:pt-2">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-mute">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
