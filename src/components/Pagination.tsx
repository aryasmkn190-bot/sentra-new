"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-black/5 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => currentPage > 1 && router.push(createPageUrl(currentPage - 1))}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center rounded-lg border border-black/5 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          Sebelumnya
        </button>
        <button
          onClick={() => currentPage < totalPages && router.push(createPageUrl(currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="relative ml-3 inline-flex items-center rounded-lg border border-black/5 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          Selanjutnya
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-semibold">
            Menampilkan halaman <span className="font-extrabold text-slate-800">{currentPage}</span> dari <span className="font-extrabold text-slate-800">{totalPages}</span> (<span className="font-extrabold text-slate-800">{totalItems}</span> item)
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
            <button
              onClick={() => currentPage > 1 && router.push(createPageUrl(currentPage - 1))}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center rounded-l-lg border border-black/5 bg-white px-2 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <span className="sr-only">Sebelumnya</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <Link
                  key={pageNum}
                  href={createPageUrl(pageNum)}
                  className={`relative inline-flex items-center border border-black/5 px-3.5 py-2 text-xs font-bold transition-colors ${
                    isCurrent
                      ? "z-10 bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}
            <button
              onClick={() => currentPage < totalPages && router.push(createPageUrl(currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="relative inline-flex items-center rounded-r-lg border border-black/5 bg-white px-2 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <span className="sr-only">Selanjutnya</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}