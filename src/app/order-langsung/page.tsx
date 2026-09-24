import { getActiveDirectProducts } from "@/actions/direct-order";
import { DirectScanner } from "./Scanner";

export const dynamic = "force-dynamic";

export default async function OrderLangsungPage() {
  const directProducts = await getActiveDirectProducts();
  return <DirectScanner directProducts={directProducts} />;
}
