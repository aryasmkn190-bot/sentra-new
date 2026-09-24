"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };

/**
 * Dropdown multi-select dengan daftar checkbox + pencarian.
 * Nilai terpilih dikirim sebagai hidden input `<input name={name} value=...>`
 * sehingga FormData.getAll(name) tetap mengembalikan array (pola form standar).
 */
export function MultiSelect({
  name,
  options,
  defaultValue = [],
  placeholder = "Pilih…",
  emptyText = "Tidak ada opsi.",
}: {
  name: string;
  options: Option[];
  defaultValue?: string[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (value: string) =>
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o.value));

  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  return (
    <div ref={wrapRef} className="relative">
      {/* Hidden inputs agar terkirim via FormData.getAll */}
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-slate-300"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-1">
          {selected.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            <>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                {selected.length} dipilih
              </span>
              <span className="truncate text-slate-500">
                {selectedLabels.slice(0, 2).join(", ")}
                {selectedLabels.length > 2 ? ` +${selectedLabels.length - 2} lagi` : ""}
              </span>
            </>
          )}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
          <div className="border-b border-black/5 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari…"
              className="w-full rounded-lg border border-black/10 bg-slate-50 px-2.5 py-1.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-500"
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-slate-400">{emptyText}</p>
            ) : (
              filtered.map((o) => {
                const checked = selected.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                      checked ? "bg-emerald-50 text-emerald-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="min-w-0 truncate">{o.label}</span>
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-emerald-600">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-black/5 bg-slate-50 px-2 py-1.5">
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => {
                  const merged = [...prev];
                  for (const o of filtered) if (!merged.includes(o.value)) merged.push(o.value);
                  return merged;
                })
              }
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
              disabled={allFilteredSelected}
            >
              ✓ Pilih semua
            </button>
            <button
              type="button"
              onClick={() => {
                const vals = new Set(filtered.map((o) => o.value));
                setSelected((prev) => prev.filter((v) => !vals.has(v)));
              }}
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              disabled={!filtered.some((o) => selected.includes(o.value))}
            >
              Hapus ({filtered.filter((o) => selected.includes(o.value)).length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
