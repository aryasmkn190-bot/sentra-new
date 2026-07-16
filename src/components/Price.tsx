import { rupiah } from "@/lib/money";

export function Price({ amount, compareAt, size = "md" }: { amount: number; compareAt?: number | null; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className="inline-flex items-baseline gap-1.5 tabular-nums">
      <span className={`${cls} font-extrabold text-tinta`}>{rupiah(amount)}</span>
      {compareAt && compareAt > amount ? (
        <span className="text-xs text-tinta/40 line-through">{rupiah(compareAt)}</span>
      ) : null}
    </span>
  );
}
