"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ProductForm } from "./ProductForm";
import { getCategories, getProduct } from "@/actions/admin";

type ProductItem = {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  compare_at_price: number | null;
  unit: string;
  description: string;
  max_qty_per_order: number;
  status: string;
  image_url?: string;
};

type CategoryOpt = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId?: string | null;
};

export function ProductModal({ open, onClose, onSuccess, productId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      loadData();
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
  }, [open, productId]);

  const loadData = async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats ?? []);

    if (productId) {
      const prod = await getProduct(productId);
      setProduct(prod as ProductItem | null);
    } else {
      setProduct(null);
    }
    setLoading(false);
  };

  const handleClose = useCallback(() => {
    document.body.style.overflow = "";
    onClose();
  }, [onClose]);

  const handleSuccess = useCallback(() => {
    document.body.style.overflow = "";
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = () => handleClose();
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [handleClose]);

  if (!open) return null;

  const isEdit = !!productId;
  const title = isEdit ? "Ubah Produk" : "Produk Baru";

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-end md:open:items-center open:justify-center"
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-xl rounded-t-3xl bg-white shadow-2xl md:rounded-2xl md:m-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <ProductForm
              categories={categories}
              product={product}
              inModal
              onSuccess={handleSuccess}
              onCancel={handleClose}
            />
          )}
        </div>
      </div>

      <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 md:hidden" />
    </dialog>
  );
}
