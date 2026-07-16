import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateUserProfile } from "@/actions/auth";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Perbarui Profil" };

export default async function ProfilePage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/akun/profil");

  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user) redirect("/masuk");

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-5">
      {/* Header back */}
      <div className="flex items-center gap-3">
        <a
          href="/akun"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-black/5 text-slate-600 hover:text-brand transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </a>
        <h1 className="text-lg font-extrabold text-slate-800">Perbarui Profil</h1>
      </div>

      <div className="kartu p-5 space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white font-bold text-lg">
            {(user.name || user.phone_number).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{user.name || "Pengguna"}</p>
            <p className="text-xs text-slate-500">{user.phone_number}</p>
          </div>
        </div>

        <ProfileForm user={user} action={updateUserProfile} />
      </div>
    </div>
  );
}