import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateUserProfile } from "@/actions/auth";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Perbarui Profil" };

export default async function ProfilePage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/akun/profil");

  const [user, dropPoints] = await Promise.all([
    db.user.findUnique({ where: { id: session.sub } }),
    db.dropPoint.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!user) redirect("/masuk");

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pt-4">
      <div className="kartu space-y-1 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A00000] text-lg font-bold text-white">
            {(user.name || user.phone_number).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{user.name || "Pengguna"}</p>
            <p className="text-xs text-slate-500">{user.phone_number}</p>
          </div>
        </div>

        <ProfileForm user={user} dropPoints={dropPoints} action={updateUserProfile} />
      </div>
    </div>
  );
}
