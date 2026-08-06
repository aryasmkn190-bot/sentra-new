import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession("user");
  if (session) redirect("/");

  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold text-slate-800">Masuk</h1>
        <p className="text-sm text-slate-500">
          Masukkan nomor HP kamu untuk menerima kode OTP via WhatsApp
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
