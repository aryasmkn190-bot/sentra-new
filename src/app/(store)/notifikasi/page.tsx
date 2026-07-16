import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { markAnnouncementAsRead, markAllAnnouncementsAsRead } from "@/actions/announcements";
import { IconBell } from "@/components/MenuIcons";

export default async function NotifikasiPage() {
  const session = await getSession("user");
  if (!session) {
    redirect("/masuk");
  }

  const userId = session.sub;

  // Ambil semua pengumuman aktif
  const announcements = await db.announcement.findMany({
    where: { is_active: true },
    orderBy: { created_at: "desc" },
    include: {
      reads: {
        where: { user_id: userId },
      },
    },
  });

  const unreadCount = announcements.filter((a) => a.reads.length === 0).length;

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-tinta flex items-center gap-2">
            <span className="text-[#A00000]"><IconBell size={24} /></span>
            Notifikasi
          </h1>
          <p className="text-xs text-tinta/60">Info promosi, diskon terbaru, dan berita penting.</p>
        </div>
        {unreadCount > 0 && (
          <form action={async () => {
            "use server";
            await markAllAnnouncementsAsRead();
          }}>
            <button
              type="submit"
              className="text-xs font-bold text-[#A00000] hover:underline"
            >
              Tandai semua dibaca
            </button>
          </form>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <div className="rounded-full bg-tinta/5 p-4 text-tinta/40">
              <IconBell size={40} />
            </div>
            <p className="text-sm font-bold text-tinta/60">Belum ada notifikasi</p>
            <p className="text-xs text-tinta/40">Promo dan pengumuman menarik akan muncul di sini.</p>
          </div>
        ) : (
          announcements.map((a) => {
            const isRead = a.reads.length > 0;
            return (
              <div
                key={a.id}
                className={`relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all ${
                  !isRead ? "border-[#A00000]/20 bg-[#A00000]/5" : ""
                }`}
              >
                {!isRead && (
                  <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-[#A00000]" />
                )}

                <div className="flex flex-col gap-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                      a.type === "promo" ? "bg-purple-100 text-purple-700" :
                      a.type === "discount" ? "bg-red-100 text-red-700" :
                      a.type === "release" ? "bg-blue-100 text-blue-700" :
                      a.type === "warning" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {a.type === "discount" ? "Diskon" : a.type === "release" ? "Produk Baru" : a.type}
                    </span>
                    <span className="text-[10px] text-tinta/40">
                      {new Date(a.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-tinta mt-1">{a.title}</h3>
                  <p className="text-xs text-tinta/80 whitespace-pre-line leading-relaxed">{a.body}</p>

                  {a.target_url && (
                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        href={a.target_url}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#A00000] hover:underline"
                      >
                        Lihat Selengkapnya
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  )}

                  {!isRead && (
                    <form
                      action={async () => {
                        "use server";
                        await markAnnouncementAsRead(a.id);
                      }}
                      className="mt-2 text-right"
                    >
                      <button
                        type="submit"
                        className="text-[10px] font-bold text-tinta/40 hover:text-tinta/70 hover:underline"
                      >
                        Tandai dibaca
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
