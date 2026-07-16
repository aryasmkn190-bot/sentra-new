import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getActiveCart, getActiveHub } from "@/lib/storefront";
import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getSession("user");
  if (!session) redirect("/masuk?next=/checkout");

  const cart = await getActiveCart();
  if (!cart || cart.items.length === 0) redirect("/keranjang");

  const hub = await getActiveHub();

  const stocks = await db.hubStock.findMany({
    where: { hub_id: cart.hub_id, product_id: { in: cart.items.map((i) => i.product_id) } },
  });
  const subtotal = cart.items.reduce((sum, i) => {
    const s = stocks.find((x) => x.product_id === i.product_id);
    return sum + (s?.price_override ?? i.product.base_price) * i.qty;
  }, 0);

  const dropPoints = await db.dropPoint.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    select: { id: true, name: true },
  });

  return (
    <CheckoutForm
      dropPoints={dropPoints}
      subtotal={subtotal}
    />
  );
}