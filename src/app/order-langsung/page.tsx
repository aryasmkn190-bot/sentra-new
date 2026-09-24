import { db } from "@/lib/db";
import { availableQty } from "@/lib/direct-order";
import { DirectScanner } from "./Scanner";

export const dynamic = "force-dynamic";

export default async function OrderLangsungPage() {
  const products = await db.directProduct.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  });

  const directProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock_qty: p.stock_qty,
    reserved_qty: p.reserved_qty,
    available: availableQty(p.stock_qty, p.reserved_qty),
    image_url: p.image_url,
    qr_token: p.qr_token,
    category: p.category,
  }));

  return <DirectScanner directProducts={directProducts} />;
}
