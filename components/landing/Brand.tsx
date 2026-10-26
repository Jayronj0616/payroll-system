export default function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "w-7 h-7 text-sm rounded-lg" : "w-9 h-9 text-lg rounded-xl";
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`${box} bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20`}
      >
        P
      </span>
      <span className={`${size === "sm" ? "text-base" : "text-lg"} font-semibold tracking-tight text-slate-900`}>
        Payroll<span className="text-blue-600">Pro</span>
      </span>
    </span>
  );
}
