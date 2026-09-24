import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveCart, getActiveHub } from "@/lib/storefront";
import { getCurrentBatchStatus } from "@/lib/batch";
import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/checkout");

  // Jika sistem batch sedang ditutup, arahkan ke keranjang dengan peringatan
  const batch = await getCurrentBatchStatus();
  if (batch.isActive && !batch.isOpen) {
    redirect("/keranjang");
  }

  const cart = await getActiveCart();
  if (!cart || cart.items.length === 0) redirect("/keranjang");

  const hub = await getActiveHub();

  const variantIds = cart.items
    .filter((i) => i.variant_id)
    .map((i) => i.variant_id!);

  const stocks = variantIds.length
    ? await db.hubStock.findMany({
        where: { hub_id: cart.hub_id, variant_id: { in: variantIds } },
      })
    : [];

  const subtotal = cart.items.reduce((sum, i) => {
    if (i.bundle) return sum + i.bundle.price * i.qty;
    if (i.variant) {
      const s = stocks.find((x) => x.variant_id === i.variant_id);
      return sum + (s?.price_override ?? i.variant.base_price) * i.qty;
    }
    return sum;
  }, 0);

  const [dropPoints, user] = await Promise.all([
    db.dropPoint.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true },
    }),
    db.user.findUnique({
      where: { id: session.sub },
      select: { preferred_drop_point_id: true },
    }),
  ]);

  return (
    <CheckoutForm
      dropPoints={dropPoints}
      subtotal={subtotal}
      preferredDropPointId={user?.preferred_drop_point_id ?? null}
    />
  );
}
