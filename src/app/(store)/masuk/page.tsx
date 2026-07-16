import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession("user");
  if (session) redirect("/");

  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-extrabold text-slate-800">Masuk</h1>
        <p className="text-sm text-slate-500">
          Masukkan nomor HP kamu untuk menerima kode OTP via WhatsApp
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
        <LoginForm next={next} />
      </div>

      <p className="text-center text-xs text-slate-400">
        Dengan masuk, kamu menyetujui{" "}
        <a href="/syarat" className="underline hover:text-brand">
          Syarat & Ketentuan
        </a>{" "}
        dan{" "}
        <a href="/privasi" className="underline hover:text-brand">
          Kebijakan Privasi
        </a>{" "}
        kami.
      </p>
    </div>
  );
}
