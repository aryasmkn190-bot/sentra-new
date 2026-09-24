import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logoutUser } from "@/actions/auth";
import { setDefaultAddress } from "@/actions/address";
import { ActionButton } from "@/components/ActionButton";

export const metadata = { title: "Akun Saya" };

export default async function AccountPage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/akun");

  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { addresses: { orderBy: [{ is_default: "desc" }, { created_at: "desc" }] } },
  });
  if (!user) redirect("/masuk");

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-lg font-extrabold">Akun Saya</h1>

      <div className="kartu p-4">
        <p className="text-sm font-extrabold">{user.name || "Pengguna Sentra"}</p>
        <p className="text-xs text-tinta/60">{user.phone_number}</p>
        {user.email && <p className="text-xs text-tinta/60">{user.email}</p>}
        <p className="mt-2 rounded-xl bg-hijau-muda px-3 py-2 text-xs">
          Kode referral kamu: <span className="font-extrabold tracking-wider">{user.referral_code}</span>
          <span className="block text-tinta/60">Ajak teman, kalian berdua dapat voucher setelah order pertamanya sukses.</span>
        </p>
        <Link
          href="/akun/profil"
          className="btn-utama mt-3 flex w-full items-center justify-center gap-2 text-xs font-bold !py-2.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          Perbarui Data Profil
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-extrabold">Menu</h2>
        <div className="space-y-2">
          <Link href="/akun/voucher" className="kartu flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-extrabold">🎟️ Voucher Saya</p>
              <p className="text-xs text-tinta/60">Lihat & klaim voucher</p>
            </div>
            <span className="font-bold text-hijau">→</span>
          </Link>
          <Link href="/pesanan" className="kartu flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-extrabold">📦 Pesanan Saya</p>
              <p className="text-xs text-tinta/60">Lacak dan lihat riwayat pesanan</p>
            </div>
            <span className="font-bold text-hijau">→</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-extrabold">Alamat tersimpan</h2>
        {user.addresses.length === 0 ? (
          <p className="kartu p-4 text-xs text-tinta/60">Belum ada alamat. Tambahkan saat checkout.</p>
        ) : (
          <div className="space-y-2">
            {user.addresses.map((a) => (
              <div key={a.id} className="kartu p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-hijau">{a.label}</span>
                  {a.is_default ? (
                    <span className="rounded-full bg-hijau-muda px-2 py-0.5 text-[10px] font-bold text-hijau-tua">Utama</span>
                  ) : (
                    <form action={setDefaultAddress.bind(null, a.id)}>
                      <button className="text-[11px] font-bold text-hijau">Jadikan utama</button>
                    </form>
                  )}
                </div>
                <p className="text-sm font-semibold">{a.recipient_name} · {a.recipient_phone}</p>
                <p className="text-xs text-tinta/60">{a.full_address}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <form action={logoutUser}>
        <button className="btn-garis w-full !border-merah !text-merah hover:!bg-red-50">Keluar</button>
      </form>
    </div>
  );
}