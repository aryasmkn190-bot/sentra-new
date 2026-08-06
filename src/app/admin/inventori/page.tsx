import { redirect } from "next/navigation";

/** Inventori digabung ke menu Produk (Atur Stok). */
export default function InventoryRedirect() {
  redirect("/admin/produk");
}
