import { PartnerLoginForm } from "./PartnerLoginForm";

export const metadata = { title: "Masuk Mitra" };

export default function PartnerLoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <div className="mb-6 text-center">
        <p className="text-3xl" aria-hidden>🧑‍🔧</p>
        <h1 className="text-xl font-extrabold">Sentra Mitra</h1>
        <p className="mt-1 text-sm text-tinta/60">Picker & Driver — masuk dengan nomor HP terdaftar.</p>
      </div>
      <PartnerLoginForm />
    </div>
  );
}
