import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatRestriction } from "@/lib/vouchers";
import { rupiah } from "@/lib/money";
import { ClaimButton } from "@/components/ClaimButton";

export const metadata = { title: "Voucher Saya" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  claimed: { label: "Belum dipakai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used: { label: "Terpakai", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  expired: { label: "Kadaluarsa", cls: "bg-red-50 text-merah border-red-200" },
};

function VoucherCard({ v, badge, isAvailable, onRight }: any) {
  return (
    <div className="kartu p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-hijau-tua">{v.name}</p>
          <p className="mt-0.5 text-xs text-tinta/70">
            {v.type === "fixed"
              ? `Diskon ${rupiah(v.value)}`
              : v.type === "percentage"
                ? `Diskon ${v.value}%${v.max_discount ? ` (maks ${rupiah(v.max_discount)})` : ""}`
                : "Gratis ongkir"}
            {" · "}min. belanja {rupiah(v.min_order_amount)}
          </p>
          {formatRestriction(v) && (
            <p className="mt-1 rounded-lg bg-[#FFF3D6] px-2 py-1 text-[10px] font-bold text-[#8a5a00]">
              ⏰ {formatRestriction(v)}
            </p>
          )}
          <p className="mt-1 text-[10px] text-tinta/50">
            Berlaku s.d. {new Date(v.end_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {isAvailable ? (
            onRight
          ) : (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${STATUS[badge]?.cls ?? ""}`}>
              {STATUS[badge]?.label ?? badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AkunVoucherPage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/akun/voucher");

  const now = new Date();
  const [claims, available] = await Promise.all([
    db.claimedVoucher.findMany({
      where: { user_id: session.sub },
      include: { voucher: true },
      orderBy: { claimed_at: "desc" },
    }),
    db.voucher.findMany({
      where: { is_active: true, start_at: { lte: now }, end_at: { gte: now } },
      orderBy: { start_at: "desc" },
    }),
  ]);

  const claimedIds = new Set(claims.map((c) => c.voucher_id));
  const toClaim = available.filter((v) => !claimedIds.has(v.id));

  const myClaims = claims.map((c) => {
    const v = c.voucher;
    const expired =
      c.status !== "used" && (now < v.start_at || now > v.end_at);
    return { ...c, badge: c.status === "used" ? "used" : expired ? "expired" : "claimed" };
  });

  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold">Voucher Saya</h1>
        <Link href="/akun" className="text-xs font-bold text-hijau">← Akun</Link>
      </div>

      {toClaim.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-tinta/80">Tersedia untuk diklaim</h2>
          <div className="space-y-2">
            {toClaim.map((v) => (
              <VoucherCard key={v.id} v={v} isAvailable onRight={<ClaimButton voucherId={v.id} />} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-extrabold text-tinta/80">
          Voucherku {myClaims.length > 0 && <span className="text-tinta/50">({myClaims.length})</span>}
        </h2>
        {myClaims.length === 0 ? (
          <p className="kartu p-4 text-xs text-tinta/60">
            Belum ada voucher yang diklaim. Klaim dari halaman utama atau daftar di atas.
          </p>
        ) : (
          <div className="space-y-2">
            {myClaims.map((c) => (
              <VoucherCard key={c.id} v={c.voucher} badge={c.badge} />
            ))}
          </div>
        )}
      </section>

      <p className="rounded-xl bg-hijau-muda px-3 py-2 text-[11px] text-tinta/70">
        💡 Voucher yang sudah diklaim bisa dipilih saat checkout untuk memotong harga.
      </p>
    </div>
  );
}
