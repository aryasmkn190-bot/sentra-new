"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { resolveDirectScan } from "@/actions/direct-order";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

export function DirectScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lockRef = useRef(false);
  const lastTickRef = useRef(0);
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Menyiapkan kamera…");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleRaw = useCallback(
    async (raw: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      setStatus("Memeriksa QR…");
      try {
        const res = await resolveDirectScan(raw);
        if ("error" in res && res.error) {
          setError(res.error);
          setStatus("Arahkan kamera ke QR produk Order Langsung");
          // izinkan scan ulang setelah QR salah
          setTimeout(() => {
            lockRef.current = false;
            setBusy(false);
          }, 1200);
          return;
        }
        if ("product" in res && res.product) {
          stop();
          router.push(`/order-langsung/p/${res.product.qr_token}`);
          return;
        }
        lockRef.current = false;
        setBusy(false);
      } catch {
        setError("Gagal memproses QR.");
        lockRef.current = false;
        setBusy(false);
      }
    },
    [router, stop]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Kamera tidak didukung di browser ini. Pakai input manual di bawah, atau buka lewat HTTPS di HP.");
        setStatus("Kamera tidak tersedia");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setStatus("Arahkan kamera ke QR produk");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector as
          | (new (opts?: { formats: string[] }) => BarcodeDetectorLike)
          | undefined;

        let detector: BarcodeDetectorLike | null = null;
        if (BD) {
          try {
            detector = new BD({ formats: ["qr_code"] });
          } catch {
            detector = null;
          }
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;

        const tick = async (ts: number) => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(tick);

          // throttle ~8 fps — hemat CPU, cukup untuk QR
          if (ts - lastTickRef.current < 120) return;
          lastTickRef.current = ts;
          if (lockRef.current || !video || video.readyState < 2) return;

          // 1) Native BarcodeDetector (Chrome Android / Edge)
          if (detector) {
            try {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) {
                await handleRaw(codes[0].rawValue);
                return;
              }
            } catch {
              /* fall through to jsQR */
            }
          }

          // 2) jsQR — fallback universal (iOS Safari, Firefox, desktop)
          if (!canvas || !ctx) return;
          const w = Math.min(video.videoWidth || 640, 640);
          const h = Math.round(((video.videoHeight || 480) / (video.videoWidth || 640)) * w);
          if (w < 8 || h < 8) return;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code?.data) {
            await handleRaw(code.data);
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setError("Izin kamera ditolak atau kamera sibuk. Izinkan kamera (HTTPS), atau isi kode manual.");
        setStatus("Kamera tidak aktif");
      }
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [handleRaw, stop]);

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    await handleRaw(manual.trim());
  };

  return (
    <div className="space-y-4 px-4 pt-2 pb-4">
      <div>
        <h1 className="text-xl font-extrabold text-tinta">Order Langsung</h1>
        <p className="text-xs text-tinta/50">Scan QR produk di gudang, bayar di aplikasi, ambil langsung.</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* offscreen canvas for jsQR frame grab */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-semibold text-white drop-shadow">
          {status}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-merah">{error}</div>
      )}

      <form onSubmit={submitManual} className="kartu space-y-2 p-4">
        <label className="label" htmlFor="manual-token">
          Atau masukkan kode / tempel link QR
        </label>
        <input
          id="manual-token"
          className="input"
          placeholder="Token atau https://…/order-langsung/p/…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-utama w-full">
          {busy ? "Memeriksa…" : "Lanjut"}
        </button>
      </form>

      <p className="text-center text-[11px] text-slate-400">
        Butuh HTTPS + izin kamera. Dekatkan QR ke kotak putih.
      </p>
    </div>
  );
}
