"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DropPointOpt = { id: string; name: string };

type User = {
  id: string;
  name: string;
  email: string | null;
  date_of_birth: Date | null;
  preferred_drop_point_id: string | null;
};

const BULAN = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
] as const;

/** Ambil YYYY-MM-DD aman dari Date (hindari geser hari karena timezone). */
function toYmdParts(value: Date | string | null | undefined): {
  day: string;
  month: string;
  year: string;
} {
  if (!value) return { day: "", month: "", year: "" };
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { day: "", month: "", year: "" };
  // Pakai UTC karena server simpan date-only sebagai UTC midnight
  const year = String(d.getUTCFullYear());
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { day, month, year };
}

function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function ProfileForm({
  user,
  dropPoints,
  action,
}: {
  user: User;
  dropPoints: DropPointOpt[];
  action: (prev: unknown, fd: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const [saved, setSaved] = useState(false);

  const initial = toYmdParts(user.date_of_birth);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  useEffect(() => {
    if (state?.ok) {
      setSaved(true);
      setTimeout(() => router.push("/akun"), 800);
    }
  }, [state, router]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= 1940; y -= 1) list.push(y);
    return list;
  }, [currentYear]);

  const maxDay = daysInMonth(Number(year) || 2000, Number(month) || 1);
  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0")),
    [maxDay]
  );

  // Kalau ganti bulan/tahun bikin hari invalid (31 Feb), clamp
  useEffect(() => {
    if (day && Number(day) > maxDay) {
      setDay(String(maxDay).padStart(2, "0"));
    }
  }, [day, maxDay]);

  const dateOfBirth =
    day && month && year ? `${year}-${month}-${day}` : "";

  const preferredId =
    user.preferred_drop_point_id &&
    dropPoints.some((dp) => dp.id === user.preferred_drop_point_id)
      ? user.preferred_drop_point_id
      : "";

  const selectClass =
    "input appearance-none bg-[length:12px] bg-[right_0.85rem_center] bg-no-repeat pr-9";
  const selectBg =
    "data-[empty=true]:text-tinta/40";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nama Lengkap
        </label>
        <input
          id="name"
          name="name"
          defaultValue={user.name}
          placeholder="Masukkan nama lengkap"
          className="input"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email || ""}
          placeholder="email@contoh.com (opsional)"
          className="input"
        />
      </div>

      <div>
        <label className="label">Tanggal Lahir</label>
        {/* Nilai gabungan untuk server action */}
        <input type="hidden" name="date_of_birth" value={dateOfBirth} />

        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-tinta/45">
              Tanggal
            </span>
            <select
              aria-label="Tanggal"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              data-empty={!day}
              className={`${selectClass} ${selectBg}`}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2314201A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="">Tgl</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {Number(d)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-tinta/45">
              Bulan
            </span>
            <select
              aria-label="Bulan"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              data-empty={!month}
              className={`${selectClass} ${selectBg}`}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2314201A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="">Bln</option>
              {BULAN.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-tinta/45">
              Tahun
            </span>
            <select
              aria-label="Tahun"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              data-empty={!year}
              className={`${selectClass} ${selectBg}`}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2314201A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="">Thn</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-tinta/50">
          Opsional. Dipakai untuk verifikasi usia jika diperlukan.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="preferred_drop_point_id">
          Drop Point Default
        </label>
        <select
          id="preferred_drop_point_id"
          name="preferred_drop_point_id"
          defaultValue={preferredId}
          className={selectClass}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2314201A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
          }}
        >
          <option value="">Pilih drop point (opsional)</option>
          {dropPoints.map((dp) => (
            <option key={dp.id} value={dp.id}>
              {dp.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] leading-relaxed text-tinta/50">
          Drop point ini otomatis terisi saat checkout. Kamu tetap bisa menggantinya
          per pesanan.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-center text-sm text-red-600">
          {state.error}
        </p>
      )}

      {saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-center text-sm text-emerald-600">
          ✓ Profil berhasil diperbarui
        </p>
      )}

      {/* Sticky bottom CTA — like checkout, replaces bottom nav */}
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-100 bg-white px-6 pb-6 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#A00000] text-base font-extrabold text-white shadow-lg shadow-[#A00000]/30 transition-all hover:bg-[#800000] active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-tinta/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Data disimpan aman di akunmu
        </div>
      </div>

      <div className="h-28" />
    </form>
  );
}
