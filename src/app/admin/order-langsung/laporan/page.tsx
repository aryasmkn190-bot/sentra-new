import { redirect } from "next/navigation";
import { getDirectOrderReport } from "@/actions/direct-order";
import { getSession } from "@/lib/session";
import { DirectOrderReportView } from "./ReportView";

export default async function DirectOrderReportPage() {
  const session = await getSession("admin");
  if (!session) redirect("/admin/login");

  const reportData = await getDirectOrderReport("30d");

  return <DirectOrderReportView initialData={reportData} />;
}
