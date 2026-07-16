import { AdminLoginForm } from "./AdminLoginForm";

export const metadata = { title: "Masuk Admin" };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-extrabold text-hijau-tua">Sentra <span className="text-hijau">Backoffice</span></h1>
        <p className="mt-1 text-sm text-tinta/60">Khusus tim internal.</p>
      </div>
      <AdminLoginForm />
    </div>
  );
}
