export const inputClassName =
  "h-11 rounded-[10px] border-[1.5px] border-[#E2E2E2] px-3.5 text-sm outline-none focus:border-brand-teal";

export function FormField({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[#444]">{label}</label>
      {children}
      {error && <span className="text-xs text-[#DD3333]">{error}</span>}
    </div>
  );
}
