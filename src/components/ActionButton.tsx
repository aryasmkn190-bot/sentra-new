"use client";

import { useState, useTransition } from "react";

/** Tombol yang memanggil server action tanpa argumen form — dengan konfirmasi opsional. */
export function ActionButton({
  action,
  children,
  confirmText,
  className = "btn-utama",
}: {
  action: () => Promise<{ ok?: boolean; error?: string } | void>;
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full">
      <button
        className={`${className} w-full`}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const res = await action();
            if (res && "error" in res && res.error) setError(res.error);
          });
        }}
      >
        {pending ? "Memproses…" : children}
      </button>
      {error && <p className="mt-1.5 text-xs text-merah">{error}</p>}
    </div>
  );
}
